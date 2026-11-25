import { applySessionCookies, forwardSessionCookie } from "@monorise-team/auth/next";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/server/auth";

/** Strony dostępne bez logowania. */
const PUBLIC_PAGES = new Set(["/signed-out"]);

/**
 * Przed każdą stroną panelu: sesja z ciasteczka, odświeżona z wyprzedzeniem (Server Component nie zapisze
 * `Set-Cookie`, ADR-0098). Bez sesji: logowanie w Core i powrót na tę samą stronę. Trasy API odświeżają same.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/") || PUBLIC_PAGES.has(pathname)) return NextResponse.next();

  const auth = getAuth();
  const session = await auth.getSession(request).catch(() => null);
  if (!session) {
    const signIn = new URL("/api/auth/sign-in", request.url);
    signIn.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }
  const response = NextResponse.next({ request: { headers: forwardSessionCookie(request, session) } });
  return applySessionCookies(response, session);
}

export const config = {
  // Wszystko poza plikami Next.js i statycznymi
  matcher: ["/((?!_next/|favicon.ico|robots.txt).*)"],
};
