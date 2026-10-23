import { NextRequest, NextResponse } from "next/server";
import { getAccessDenial } from "./lib/access.mjs";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/_next/image") return new NextResponse(null, { status: 404 });
  const denied = await getAccessDenial(request.headers);
  if (denied) return denied;
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static/|favicon.ico).*)"] };
