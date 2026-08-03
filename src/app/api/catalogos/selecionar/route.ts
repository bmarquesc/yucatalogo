import { NextResponse } from "next/server";

import { getConviteiraByIdForUser } from "@/db/queries";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { ACTIVE_CATALOGO_COOKIE, requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SelecionarPayload = {
  catalogoId?: string;
};

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<SelecionarPayload>(request);

    if (!body.catalogoId) {
      return jsonError("Informe o catálogo.");
    }

    const catalogo = await getConviteiraByIdForUser(
      body.catalogoId,
      conviteira.clerkUserId
    );

    if (!catalogo) {
      return jsonError("Catálogo não encontrado.", 404);
    }

    const response = NextResponse.json({
      catalogo: {
        id: catalogo.id,
        nomeMarca: catalogo.nomeMarca,
        slug: catalogo.slug
      }
    });

    response.cookies.set(ACTIVE_CATALOGO_COOKIE, catalogo.id, {
      path: "/",
      sameSite: "lax"
    });

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
