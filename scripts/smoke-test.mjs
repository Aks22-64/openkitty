import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

async function withServer(password, run) {
  const reserve = createServer();
  await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const env = { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", OPENKITTY_GROSSING_BUNDLED: "1" };
  if (password) env.OPENKITTY_PASSWORD = password; else delete env.OPENKITTY_PASSWORD;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {env, stdio: ["ignore", "pipe", "pipe"]});
  let logs = "";
  child.stdout.on("data", chunk => { logs = (logs + chunk).slice(-10_000); });
  child.stderr.on("data", chunk => { logs = (logs + chunk).slice(-10_000); });
  const base = `http://127.0.0.1:${port}`;
  const request = (path, headers = {}, options = {}) => fetch(base + path, {...options, headers, signal: AbortSignal.timeout(15_000), redirect: "manual"});
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`Server exited: ${logs}`);
      try { const response = await request("/api/search"); await response.body?.cancel(); ready = true; break; } catch { await delay(100); }
    }
    assert.ok(ready, `Server did not start: ${logs}`);
    await run(request, base);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([new Promise(resolve => child.once("exit", resolve)), delay(5000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

await withServer(undefined, async request => {
  for (const path of ["/", "/api/search?q=a", "/api/grossing", "/app/unknown"]) {
    const response = await request(path);
    assert.equal(response.status, 503, path);
    assert.match(response.headers.get("cache-control"), /no-store/);
    await response.body?.cancel();
  }
});
console.log("PASS: missing password fails closed for pages and API");

const password = randomBytes(32).toString("base64url");
await withServer(password, async (request, base) => {
  const post = (path, body, origin = base) => request(path, { origin, "content-type": "application/x-www-form-urlencoded" }, { method: "POST", body: new URLSearchParams(body) });
  for (const path of ["/", "/charts", "/api/search?q=a", "/api/grossing", "/app/unknown"]) {
    const response = await request(path);
    assert.equal(response.status, path.startsWith("/api/") ? 401 : 307, path);
    assert.equal(response.headers.get("www-authenticate"), null);
    if (!path.startsWith("/api/")) assert.equal(new URL(response.headers.get("location")).pathname, "/login");
    await response.body?.cancel();
  }
  const bypass = await request("/api/search?q=a", {"x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware"});
  assert.equal(bypass.status, 401);
  await bypass.body?.cancel();
  const wrong = await request("/api/search", {authorization: "Basic " + Buffer.from("openkitty:wrong").toString("base64")});
  assert.equal(wrong.status, 401);
  await wrong.body?.cancel();
  const loginPage = await request("/login?next=%2Fads");
  assert.equal(loginPage.status, 200);
  assert.equal(loginPage.headers.get("referrer-policy"), "same-origin", "native forms need a non-null Origin");
  assert.match(loginPage.headers.get("content-security-policy"), /form-action 'self'/);
  assert.match(loginPage.headers.get("cache-control"), /no-store/);
  const loginHtml = await loginPage.text();
  assert.match(loginHtml, /action="\/api\/auth\/login"/);
  assert.match(loginHtml, /type="password"/);
  assert.match(loginHtml, /name="next" value="\/ads"/);
  assert.ok(!loginHtml.includes(password));
  const invalid = await post("/api/auth/login", {password: "wrong", next: "/ads"});
  assert.equal(invalid.status, 303);
  assert.equal(invalid.headers.get("set-cookie"), null);
  const invalidUrl = new URL(invalid.headers.get("location"), base);
  assert.equal(invalidUrl.searchParams.get("error"), "invalid");
  const errorPage = await request(invalidUrl.pathname + invalidUrl.search);
  assert.match(await errorPage.text(), /password wasn/);
  for (const origin of ["https://evil.example", ""]) {
    const csrf = await post("/api/auth/login", {password}, origin);
    assert.equal(csrf.status, 403);
    assert.equal(csrf.headers.get("set-cookie"), null);
    await csrf.body?.cancel();
  }
  const oversized = await post("/api/auth/login", {password: "a".repeat(5000)});
  assert.equal(oversized.status, 400);
  await oversized.body?.cancel();
  const signedIn = await post("/api/auth/login", {password, next: "/ads"});
  assert.equal(signedIn.status, 303);
  assert.equal(new URL(signedIn.headers.get("location"), base).href, base + "/ads");
  const setCookie = signedIn.headers.get("set-cookie");
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=43200", "Path=/"]) assert.ok(setCookie.includes(flag), flag);
  assert.ok(!setCookie.includes(password));
  const credentials = {cookie: setCookie.split(";")[0]};
  const tampered = await request("/api/search", {cookie: credentials.cookie + "x"});
  assert.equal(tampered.status, 401);
  await tampered.body?.cancel();
  const loginAgain = await request("/login?next=%2Fads", credentials);
  assert.equal(loginAgain.status, 307);
  assert.equal(new URL(loginAgain.headers.get("location"), base).pathname, "/ads");
  await loginAgain.body?.cancel();
  const root = await request("/", credentials);
  assert.equal(root.status, 200);
  const rootHtml = await root.text();
  assert.ok(rootHtml.includes("Top Grossing"), "Authenticated home page should render the app");
  assert.match(rootHtml, /Unavailable/);
  assert.match(rootHtml, /Apple Top Grossing/);
  assert.match(rootHtml, /Baseline collected|days<!-- --> collected/);
  assert.ok(!rootHtml.includes("Updated Daily"));
  assert.ok(!rootHtml.includes("Highest Revenue"));
  assert.ok(Buffer.byteLength(rootHtml) < 1_000_000, "Home page must not serialize the full catalog into HTML");
  for (const path of ["/ads", "/onboarding", "/trending", "/rising", "/charts", "/aso", "/explore"]) {
    const page = await request(path, credentials);
    assert.equal(page.status, 200, path);
    const html = await page.text();
    assert.ok(Buffer.byteLength(html) < 1_000_000, `${path} must remain below the Vercel page-size limit`);
    assert.match(html, /[Uu]navailable/);

    if (path === "/ads") {
      for (const url of ["https://www.facebook.com/ads/library/", "https://adstransparency.google.com/", "https://ads.tiktok.com/business/creativecenter/"]) assert.ok(html.includes(url));
      assert.ok(!html.includes("Estimated Spend"));
    }
    if (path === "/onboarding") assert.match(html, /not verified paywalls/);
    if (path === "/ads" || path === "/onboarding") assert.ok(html.includes("Next page"), `${path} must expose the rest of the catalog through pagination`);
  }
  const chartResponse = await request("/api/grossing", credentials);
  assert.equal(chartResponse.status, 200);
  assert.match(chartResponse.headers.get("cache-control"), /no-store/);
  const chartBody = await chartResponse.json();
  assert.equal(chartBody.total, 100); assert.equal(chartBody.rows.length, 25);
  assert.equal(chartBody.rows[0].rank, 1); assert.equal(chartBody.sourceFallback, true);
  const lastRanks = await (await request("/api/grossing?chart=health&page=4", credentials)).json();
  assert.equal(lastRanks.rows.at(-1).rank, 100);
  const candidates = await (await request("/api/grossing?mode=shortlist&chart=all", credentials)).json();
  assert.ok(candidates.total > 0);
  assert.ok(candidates.rows.every(row => row.reasons.length > 0 && !row.majorPublisher));
  for (const query of ["chart=bad", "days=2", "page=-1", "mode=bad", "chart=all"]) {
    const invalidChart = await request("/api/grossing?" + query, credentials);
    assert.equal(invalidChart.status, 400); await invalidChart.body?.cancel();
  }
  const search = await request("/api/search?q=a", credentials);
  assert.equal(search.status, 200);
  assert.match(search.headers.get("cache-control"), /no-store/);
  assert.equal(search.headers.get("x-content-type-options"), "nosniff");
  const body = await search.text();
  assert.equal(JSON.parse(body).results.length, 48);
  for (const app of JSON.parse(body).results) {
    for (const metric of ["estMonthlyRevenue", "estMonthlyDownloads", "activeAdsCount", "currentRank", "rankVelocity", "iapTiers"]) assert.equal(app[metric], null);
    assert.equal(app.sourceName, "Apple iTunes Search API");
    assert.equal(app.sourceMode, "snapshot");
    assert.ok(app.sourceRetrievedAt);
  }
  assert.ok(Buffer.byteLength(body) < 200_000);
  for (const q of ["a".repeat(121), "a\nb"]) {
    const response = await request("/api/search?q=" + encodeURIComponent(q), credentials);
    assert.equal(response.status, 400);
    await response.body?.cancel();
  }
  const image = await request("/_next/image?url=%2Fnext.svg&w=64&q=75", credentials);
  assert.equal(image.status, 404);
  await image.body?.cancel();
  const apps = JSON.parse(await readFile("src/data/apps.json", "utf8"));
  const detail = await request("/app/" + encodeURIComponent(apps[0].slug), credentials);
  assert.equal(detail.status, 200);
  const detailHtml = await detail.text();
  assert.match(detailHtml, /Apple iTunes Search API/);
  assert.match(detailHtml, /Refresh from Apple/);
  assert.match(detailHtml, /Unavailable/);
  for (const url of ["https://www.facebook.com/ads/library/", "https://adstransparency.google.com/", "https://ads.tiktok.com/business/creativecenter/"]) assert.ok(detailHtml.includes(url));
  const unknown = await request("/app/not-a-real-app", credentials);
  assert.equal(unknown.status, 404, "Unknown slugs must never return a fuzzy match for a different app");
  await unknown.body?.cancel();
  let limited = false;
  for (let i = 0; i < 61; i++) {
    const response = await request("/api/search", credentials);
    await response.body?.cancel();
    if (response.status === 429) { assert.equal(response.headers.get("retry-after"), "60"); limited = true; break; }
    assert.equal(response.status, 200);
  }
  assert.ok(limited, "Repeated searches must be throttled");
  const csrfLogout = await post("/api/auth/logout", {}, "https://evil.example");
  assert.equal(csrfLogout.status, 403);
  assert.equal(csrfLogout.headers.get("set-cookie"), null);
  await csrfLogout.body?.cancel();
  const logout = await post("/api/auth/logout", {});
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  const afterLogout = await request("/", {cookie: logout.headers.get("set-cookie").split(";")[0]});
  assert.equal(afterLogout.status, 307);
  await afterLogout.body?.cancel();
  let loginLimited = false;
  for (let i = 0; i < 21; i++) {
    const response = await post("/api/auth/login", {password: "wrong"});
    if (new URL(response.headers.get("location"), base).searchParams.get("error") === "limited") {
      assert.equal(response.headers.get("retry-after"), "60"); loginLimited = true; break;
    }
  }
  assert.ok(loginLimited, "Repeated login attempts must be throttled");
});
console.log("PASS: HTML sign-in, signed cookies, CSRF checks, logout, login throttling, password enforcement, bypass-header rejection, bounded search, validation, image optimizer disabled, app detail, and throttling");
