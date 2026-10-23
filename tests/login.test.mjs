import test from "node:test";
import assert from "node:assert/strict";
import { login, logout } from "../src/lib/session-routes.mjs";

const password = "test-only-random-password-long-enough";
const origin = "http://127.0.0.1:4000";
const makeRequest = (body, headers = {}) => new Request("http://localhost:4000/api/auth/login", {
  method: "POST", duplex: "half", body,
  headers: {host: "127.0.0.1:4000", origin, "content-type": "application/x-www-form-urlencoded", ...headers},
});

test("login uses the browser authority and redirects locally behind Next.js URL normalization", async () => {
  process.env.OPENKITTY_PASSWORD = password;
  const response = await login(makeRequest(new URLSearchParams({password, next: "//evil.example"})));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/");
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  for (const headers of [{origin: "null"}, {origin: "http://evil.example", "x-forwarded-host": "evil.example"}, {"sec-fetch-site": "cross-site"}]) {
    const rejected = await login(makeRequest(new URLSearchParams({password}), headers));
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get("set-cookie"), null);
  }
});

test("chunked oversized login bodies and unsupported content types are rejected without sessions", async () => {
  process.env.OPENKITTY_PASSWORD = password;
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(4097)); },
    cancel() { cancelled = true; },
  });
  const large = await login(makeRequest(stream));
  assert.equal(large.status, 400);
  assert.equal(large.headers.get("set-cookie"), null);
  assert.equal(cancelled, true);
  const json = await login(makeRequest(JSON.stringify({password}), {"content-type": "application/json"}));
  assert.equal(json.status, 400);
});

test("direct login fails closed without configuration and logout only clears this browser's cookie", async () => {
  delete process.env.OPENKITTY_PASSWORD;
  const missing = await login(makeRequest(new URLSearchParams({password})));
  assert.equal(missing.status, 503);
  assert.equal(missing.headers.get("set-cookie"), null);
  const signedOut = await logout(makeRequest(new URLSearchParams()));
  assert.equal(signedOut.status, 303);
  assert.equal(signedOut.headers.get("location"), "/login");
  assert.match(signedOut.headers.get("set-cookie"), /Max-Age=0/);
});
