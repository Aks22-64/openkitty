import { NextRequest, NextResponse } from "next/server";
import { getAccessDenial } from "./lib/access.mjs";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/_next/image") return new NextResponse(null, { status: 404 });
  const publicRoute = ["/login", "/api/auth/login", "/api/auth/logout"].includes(request.nextUrl.pathname);
  if (!publicRoute) {
    const denied = await getAccessDenial(request.headers);
    if (denied) {
      if (denied.status !== 401 || request.nextUrl.pathname.startsWith("/api/")) return denied;
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      const response = NextResponse.redirect(url);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static/|favicon.ico).*)"] };
