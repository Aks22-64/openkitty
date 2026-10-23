import { checkPassword, createSession, isAccessConfigured, privateHeaders, safeReturnPath,
  SESSION_COOKIE, SESSION_SECONDS } from "./access.mjs";
import { createRequestBudget } from "./request-limits.mjs";

const consumeLoginBudget = createRequestBudget(20);
const MAX_FORM_BYTES = 4096;

function sameOrigin(request) {
  try {
    const value = request.headers.get("origin");
    const origin = new URL(value);
    const url = new URL(request.url);
    // Next.js normalizes loopback URLs internally. Host retains the browser's authority.
    const host = request.headers.get("host") || url.host;
    const protocol = process.env.VERCEL === "1" ? "https:" : url.protocol;
    return value === origin.origin && origin.host === host && origin.protocol === protocol &&
      request.headers.get("sec-fetch-site") !== "cross-site";
  } catch { return false; }
}

function redirect(path, headers = {}) {
  return new Response(null, { status: 303, headers: {
    ...privateHeaders, ...headers, Location: path,
  } });
}

function sessionCookie(value, age) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}` +
    (process.env.NODE_ENV === "production" ? "; Secure" : "");
}

async function readForm(request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/x-www-form-urlencoded") {
    throw new Error("Unsupported form");
  }
  if (Number(request.headers.get("content-length")) > MAX_FORM_BYTES || !request.body) throw new Error("Invalid form");
  const reader = request.body.getReader();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 5000);
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FORM_BYTES) throw new Error("Form too large");
      chunks.push(value);
    }
    if (timedOut) throw new Error("Form timed out");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new URLSearchParams(new TextDecoder().decode(bytes));
  } finally {
    clearTimeout(timer);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function login(request) {
  if (!sameOrigin(request)) return new Response("Invalid request origin.", { status: 403, headers: privateHeaders });
  const password = process.env.OPENKITTY_PASSWORD;
  if (!isAccessConfigured(password)) return new Response("Application access has not been configured.", { status: 503, headers: privateHeaders });
  if (!consumeLoginBudget()) return redirect("/login?error=limited", { "Retry-After": "60" });
  let form;
  try { form = await readForm(request); }
  catch { return new Response("Invalid sign-in form.", { status: 400, headers: privateHeaders }); }
  const next = safeReturnPath(form.get("next"));
  if (await checkPassword(form.get("password"), password) !== "authorized") {
    return redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }
  const session = await createSession(password);
  return redirect(next, { "Set-Cookie": sessionCookie(session, SESSION_SECONDS) });
}

export async function logout(request) {
  if (!sameOrigin(request)) return new Response("Invalid request origin.", { status: 403, headers: privateHeaders });
  return redirect("/login", { "Set-Cookie": sessionCookie("", 0) });
}
