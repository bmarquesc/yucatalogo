import { NextResponse } from "next/server";

import { duplicateConviteiraForUser } from "@/db/queries";
import { handleRouteError, jsonError } from "@/lib/api";
import { ACTIVE_CATALOGO_COOKIE, requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { conviteira } = await requireConviteira();
    const catalogo = await duplicateConviteiraForUser({
      clerkUserId: conviteira.clerkUserId,
      conviteiraId: conviteira.id
    });
    const response = NextResponse.json(
      {
        catalogo: {
          id: catalogo.id,
          nomeMarca: catalogo.nomeMarca,
          slug: catalogo.slug
        }
      },
      { status: 201 }
    );

    response.cookies.set(ACTIVE_CATALOGO_COOKIE, catalogo.id, {
      path: "/",
      sameSite: "lax"
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "CATALOG_NOT_FOUND") {
      return jsonError("Catálogo não encontrado.", 404);
    }

    return handleRouteError(error);
  }
}
