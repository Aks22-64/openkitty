import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkAccess, getAccessDenial } from "../src/lib/access.mjs";
import { parseSearchQuery, findLocalMatches, mergeSearchResults, createRequestBudget,
  fetchBoundedStoreJson, MAX_STORE_RESPONSE_BYTES } from "../src/lib/request-limits.mjs";

const password = "test-only-password-which-is-long-enough";
const auth = (value = password, username = "openkitty") => `Basic ${Buffer.from(`${username}:${value}`).toString("base64")}`;

test("access fails closed for missing or weak configuration", async () => {
  for (const value of [undefined, "", "weak", " ".repeat(30)]) {
    assert.equal(await checkAccess(auth(), value), "unconfigured");
    assert.equal((await getAccessDenial(new Headers(), value ?? "")).status, 503);
  }
});
test("only the correct username and password authenticate", async () => {
  assert.equal(await checkAccess(auth(), password), "authorized");
  for (const value of [null, "", "Basic %%%", "Bearer abc", auth("incorrect"), auth(password, "admin"), "Basic "+"A".repeat(1024)]) {
    assert.equal(await checkAccess(value, password), "unauthorized");
  }
  assert.equal(await getAccessDenial(new Headers({ authorization: auth() }), password), null);
  const denied = await getAccessDenial(new Headers(), password);
  assert.equal(denied.status, 401);
  assert.match(denied.headers.get("www-authenticate"), /^Basic /);
  assert.equal(denied.headers.get("cache-control"), "private, no-store");
});
test("queries reject oversized and control-character input before searching", () => {
  assert.equal(parseSearchQuery("  Puzzle "), "puzzle");
  assert.equal(parseSearchQuery("你好"), "你好");
  assert.throws(() => parseSearchQuery("a".repeat(121)), RangeError);
  assert.throws(() => parseSearchQuery("a\nb"), RangeError);
});
test("the original broad-query response is capped against the real dataset", async () => {
  const apps = JSON.parse(await readFile(new URL("../src/data/apps.json", import.meta.url)));
  assert.ok(apps.filter(a => [a.name, a.developer, a.category].some(v => v.toLowerCase().includes("a"))).length > 10_000);
  const results = findLocalMatches(apps, "a");
  assert.equal(results.length, 48);
  assert.ok(Buffer.byteLength(JSON.stringify({ results })) < 200_000);
  assert.equal(findLocalMatches(apps, "").length, 48);
});
test("merged local and live results are deduplicated and bounded", () => {
  const local = Array.from({length: 40}, (_, i) => ({id: String(i)}));
  const live = Array.from({length: 30}, (_, i) => ({id: String(i + 35)}));
  const merged = mergeSearchResults(local, live);
  assert.equal(merged.length, 48);
  assert.equal(new Set(merged.map(a => a.id)).size, 48);
});
test("request budgets reject excess requests and recover after the window", () => {
  const consume = createRequestBudget(2, 1000);
  assert.equal(consume(0), true);
  assert.equal(consume(1), true);
  assert.equal(consume(999), false);
  assert.equal(consume(1000), true);
});
test("store requests cannot use attacker-selected origins or paths", async () => {
  for (const url of ["https://example.com/search", "http://itunes.apple.com/search", "https://itunes.apple.com/other", "https://user@itunes.apple.com/search"]) {
    await assert.rejects(fetchBoundedStoreJson(url, () => assert.fail("must not fetch")), /Unsupported/);
  }
});
test("store transport disables redirects and persistent cache, and sets a deadline", async () => {
  const data = await fetchBoundedStoreJson("https://itunes.apple.com/search?term=test", async (_, options) => {
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({results: []});
  });
  assert.deepEqual(data, {results: []});
});
test("both declared and chunked oversized store responses are rejected", async () => {
  await assert.rejects(fetchBoundedStoreJson("https://itunes.apple.com/search", async () =>
    new Response("{}", {headers: {"content-length": String(MAX_STORE_RESPONSE_BYTES + 1)}})), /too large/);
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_STORE_RESPONSE_BYTES + 1)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(fetchBoundedStoreJson("https://itunes.apple.com/search", async () => new Response(body)), /too large/);
  assert.equal(cancelled, true);
});
test("slow upstream requests are aborted", async () => {
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(fetchBoundedStoreJson("https://itunes.apple.com/search", async (_, {signal}) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), {once: true})), 20), {name: "TimeoutError"});
  } finally { clearTimeout(keepAlive); }
});
test("only two outbound requests may be active at once, with slots released afterwards", async () => {
  const finish = [];
  const delayed = () => new Promise(resolve => finish.push(() => resolve(Response.json({results: []}))));
  const a = fetchBoundedStoreJson("https://itunes.apple.com/search", delayed);
  const b = fetchBoundedStoreJson("https://itunes.apple.com/search", delayed);
  await assert.rejects(fetchBoundedStoreJson("https://itunes.apple.com/search", delayed), /limit reached/);
  finish.forEach(resolve => resolve());
  await Promise.all([a,b]);
  assert.deepEqual(await fetchBoundedStoreJson("https://itunes.apple.com/search", async () => Response.json({results: []})), {results: []});
});
