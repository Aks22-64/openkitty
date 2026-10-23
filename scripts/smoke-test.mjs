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
  const env = { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
  if (password) env.OPENKITTY_PASSWORD = password; else delete env.OPENKITTY_PASSWORD;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {env, stdio: ["ignore", "pipe", "pipe"]});
  let logs = "";
  child.stdout.on("data", chunk => { logs = (logs + chunk).slice(-10_000); });
  child.stderr.on("data", chunk => { logs = (logs + chunk).slice(-10_000); });
  const base = `http://127.0.0.1:${port}`;
  const request = (path, headers = {}) => fetch(base + path, {headers, signal: AbortSignal.timeout(15_000), redirect: "manual"});
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`Server exited: ${logs}`);
      try { const response = await request("/api/search"); await response.body?.cancel(); ready = true; break; } catch { await delay(100); }
    }
    assert.ok(ready, `Server did not start: ${logs}`);
    await run(request);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([new Promise(resolve => child.once("exit", resolve)), delay(5000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

await withServer(undefined, async request => {
  for (const path of ["/", "/api/search?q=a", "/app/unknown"]) {
    const response = await request(path);
    assert.equal(response.status, 503, path);
    assert.match(response.headers.get("cache-control"), /no-store/);
    await response.body?.cancel();
  }
});
console.log("PASS: missing password fails closed for pages and API");

const password = randomBytes(32).toString("base64url");
const credentials = {authorization: `Basic ${Buffer.from(`openkitty:${password}`).toString("base64")}`};
await withServer(password, async request => {
  for (const path of ["/", "/charts", "/api/search?q=a", "/app/unknown"]) {
    const response = await request(path);
    assert.equal(response.status, 401, path);
    await response.body?.cancel();
  }
  const bypass = await request("/api/search?q=a", {"x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware"});
  assert.equal(bypass.status, 401);
  await bypass.body?.cancel();
  const wrong = await request("/api/search", {authorization: "Basic " + Buffer.from("openkitty:wrong").toString("base64")});
  assert.equal(wrong.status, 401);
  await wrong.body?.cancel();
  const root = await request("/", credentials);
  assert.equal(root.status, 200);
  const rootHtml = await root.text();
  assert.ok(rootHtml.includes("Mobile App Market Intelligence"), "Authenticated home page should render the app");
  assert.ok(Buffer.byteLength(rootHtml) < 1_000_000, "Home page must not serialize the full catalog into HTML");
  for (const path of ["/ads", "/onboarding", "/trending", "/rising", "/charts", "/aso"]) {
    const page = await request(path, credentials);
    assert.equal(page.status, 200, path);
    const html = await page.text();
    assert.ok(Buffer.byteLength(html) < 1_000_000, `${path} must remain below the Vercel page-size limit`);
    if (path === "/ads" || path === "/onboarding") assert.ok(html.includes("Next page"), `${path} must expose the rest of the catalog through pagination`);
  }
  const search = await request("/api/search?q=a", credentials);
  assert.equal(search.status, 200);
  assert.match(search.headers.get("cache-control"), /no-store/);
  assert.equal(search.headers.get("x-content-type-options"), "nosniff");
  const body = await search.text();
  assert.equal(JSON.parse(body).results.length, 48);
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
  await detail.body?.cancel();
  let limited = false;
  for (let i = 0; i < 61; i++) {
    const response = await request("/api/search", credentials);
    await response.body?.cancel();
    if (response.status === 429) { assert.equal(response.headers.get("retry-after"), "60"); limited = true; break; }
    assert.equal(response.status, 200);
  }
  assert.ok(limited, "Repeated searches must be throttled");
});
console.log("PASS: password enforcement, bypass-header rejection, bounded search, validation, image optimizer disabled, app detail, and throttling");
