import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/network/join",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow landing page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Use better-auth cookie check — lightweight, no DB hit
  const session = await auth.api.getSession({
    headers: request.headers, // ← use request.headers directly, not next/headers
  });

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|favicon-96x96.png|manifest.webmanifest|web-app-manifest-192x192.png|web-app-manifest-512x512.png|apple-touch-icon.png|sw.js|workbox-).*)",
  ],
};