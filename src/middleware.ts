import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
  if (isProtectedRoute(request)) {
    auth().protect();
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
