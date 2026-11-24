// Every page and API route needs a valid session, except sign-in itself.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session.ts";

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? "");
  if (session) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/"))
    return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in again." } }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!login|api/session|_next/static|_next/image|favicon.ico).*)"],
};
