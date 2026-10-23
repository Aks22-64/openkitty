import { SignJWT, jwtVerify } from "jose";

// Shared by middleware and server routes; never imported by client components.
export const SESSION_COOKIE = "openkitty_session";
export const SESSION_SECONDS = 12 * 60 * 60;
export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export function isAccessConfigured(password) {
  return typeof password === "string" && password.trim().length >= 24 && password.length <= 256;
}

export async function checkPassword(supplied, password) {
  if (!isAccessConfigured(password)) return "unconfigured";
  if (typeof supplied !== "string" || supplied.length > 256) return "unauthorized";
  const hashes = await Promise.all([supplied, password].map(value =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
  const [left, right] = hashes.map(value => new Uint8Array(value));
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0 ? "authorized" : "unauthorized";
}

async function sessionKey(password) {
  if (!isAccessConfigured(password)) throw new Error("Access is not configured");
  // Domain-separated key from the existing high-entropy secret. Rotation revokes all sessions.
  return new Uint8Array(await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(`openkitty/session/v1:${password}`)));
}

export async function createSession(password, now = Math.floor(Date.now() / 1000)) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("openkitty").setAudience("openkitty-private").setSubject("owner")
    .setJti(crypto.randomUUID()).setIssuedAt(now).setExpirationTime(now + SESSION_SECONDS)
    .sign(await sessionKey(password));
}

export async function verifySession(token, password, now = new Date()) {
  if (!isAccessConfigured(password) || typeof token !== "string" || token.length > 1024) return false;
  try {
    const { payload } = await jwtVerify(token, await sessionKey(password), {
      algorithms: ["HS256"], typ: "JWT", issuer: "openkitty", audience: "openkitty-private",
      subject: "owner", maxTokenAge: SESSION_SECONDS, currentDate: now,
      requiredClaims: ["iat", "exp", "jti"],
    });
    return typeof payload.exp === "number" && typeof payload.iat === "number" &&
      payload.exp - payload.iat <= SESSION_SECONDS;
  } catch { return false; }
}

export async function getAccessDenial(headers, password = process.env.OPENKITTY_PASSWORD) {
  if (!isAccessConfigured(password)) {
    return new Response("Application access has not been configured.", { status: 503, headers: privateHeaders });
  }
  const cookie = headers.get("cookie") || "";
  const matches = cookie.split(";").map(value => value.trim()).filter(value => value.startsWith(`${SESSION_COOKIE}=`));
  if (matches.length === 1 && await verifySession(matches[0].slice(SESSION_COOKIE.length + 1), password)) return null;
  // No WWW-Authenticate header: embedded browsers can dismiss native Basic-auth dialogs.
  return new Response("Sign in to OpenKitty.", { status: 401, headers: privateHeaders });
}

export function safeReturnPath(value) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\u0000-\u0020\u007f]/u.test(value)) return "/";
  const target = new URL(value, "https://openkitty.invalid");
  if (target.origin !== "https://openkitty.invalid" ||
      /^\/(login|api|_next)(\/|$)/.test(target.pathname)) return "/";
  return target.pathname + target.search;
}
