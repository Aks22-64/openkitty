// Shared by middleware and server routes; never imported by client components.
export async function checkAccess(authorization, password) {
  if (typeof password !== "string" || password.trim().length < 24 || password.length > 256) return "unconfigured";
  if (!authorization || authorization.length > 1024 || !/^Basic /i.test(authorization)) return "unauthorized";
  try {
    const supplied = Uint8Array.from(atob(authorization.slice(6)), (c) => c.charCodeAt(0));
    const expected = new TextEncoder().encode(`openkitty:${password}`);
    const hashes = await Promise.all([supplied, expected].map((value) => crypto.subtle.digest("SHA-256", value)));
    const [left, right] = hashes.map((value) => new Uint8Array(value));
    let difference = 0;
    for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
    return difference === 0 ? "authorized" : "unauthorized";
  } catch {
    return "unauthorized";
  }
}

export async function getAccessDenial(headers, password = process.env.OPENKITTY_PASSWORD) {
  const result = await checkAccess(headers.get("authorization"), password);
  if (result === "authorized") return null;
  const responseHeaders = {
    "Cache-Control": "private, no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  };
  if (result === "unconfigured") {
    return new Response("Application access has not been configured.", { status: 503, headers: responseHeaders });
  }
  return new Response("Sign in to OpenKitty.", {
    status: 401,
    headers: { ...responseHeaders, "WWW-Authenticate": 'Basic realm="OpenKitty", charset="UTF-8"' },
  });
}
