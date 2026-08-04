import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPublicCatalogHost } from "@/lib/domains";

const publicRoutes = ["/entrar(.*)", "/cadastro(.*)"];

const isPublicRoute = createRouteMatcher(publicRoutes);

const isProtectedRoute = createRouteMatcher([
  "/painel(.*)",
  "/api/upload(.*)",
  "/api/conviteira(.*)",
  "/api/artes(.*)",
  "/api/caixa(.*)",
  "/api/midias(.*)",
  "/api/tipos(.*)",
  "/api/filtros(.*)",
  "/api/campos(.*)"
]);

const isPublicCatalogApiRoute = createRouteMatcher(["/api/public(.*)"]);

const isSystemRoute = createRouteMatcher([
  "/entrar(.*)",
  "/cadastro(.*)",
  "/painel(.*)",
  "/sem-acesso(.*)",
  "/producao(.*)",
  "/api(.*)"
]);

function isLocalDevAuthEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  );
}

export default clerkMiddleware((auth, request) => {
  if (
    isPublicCatalogHost(request.headers.get("host")) &&
    isSystemRoute(request) &&
    !isPublicCatalogApiRoute(request)
  ) {
    return new NextResponse("Catalogo nao encontrado.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }

  if (isLocalDevAuthEnabled()) {
    return NextResponse.next();
  }

  if (!isPublicRoute(request) && isProtectedRoute(request)) {
    const { userId } = auth();

    if (!userId) {
      const signInUrl = new URL("/entrar", request.url);
      signInUrl.searchParams.set("redirect_url", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/entrar/:path*",
    "/cadastro/:path*",
    "/sem-acesso/:path*",
    "/painel/:path*",
    "/producao/:path*",
    "/api/upload/:path*",
    "/api/conviteira/:path*",
    "/api/artes/:path*",
    "/api/caixa/:path*",
    "/api/midias/:path*",
    "/api/tipos/:path*",
    "/api/filtros/:path*",
    "/api/campos/:path*",
    "/api/public/:path*",
    "/api/webhooks/:path*"
  ]
};
