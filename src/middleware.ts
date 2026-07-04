import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = ["/entrar(.*)", "/cadastro(.*)"];

const isPublicRoute = createRouteMatcher(publicRoutes);

const isProtectedRoute = createRouteMatcher([
  "/painel(.*)",
  "/api/upload(.*)",
  "/api/conviteira(.*)",
  "/api/artes(.*)",
  "/api/midias(.*)",
  "/api/tipos(.*)",
  "/api/campos(.*)"
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request) && isProtectedRoute(request)) {
    const { userId } = auth();

    if (!userId) {
      const signInUrl = new URL("/entrar", request.url);
      signInUrl.searchParams.set("redirect_url", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }
});

export const config = {
  matcher: [
    "/painel/:path*",
    "/api/upload/:path*",
    "/api/conviteira/:path*",
    "/api/artes/:path*",
    "/api/midias/:path*",
    "/api/tipos/:path*",
    "/api/campos/:path*"
  ]
};
