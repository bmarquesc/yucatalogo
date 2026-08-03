import { NextResponse } from "next/server";

import {
  createConviteiraWithDefaults,
  getConviteirasByUserId
} from "@/db/queries";
import { handleRouteError, readJson } from "@/lib/api";
import { ACTIVE_CATALOGO_COOKIE, requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

type CatalogoPayload = {
  nomeMarca?: string;
};

export async function GET() {
  try {
    const { conviteira } = await requireConviteira();
    const catalogos = await getConviteirasByUserId(conviteira.clerkUserId);

    return NextResponse.json({
      activeCatalogoId: conviteira.id,
      catalogos: catalogos.map(toCatalogoResumo)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<CatalogoPayload>(request);
    const nomeMarca = body.nomeMarca?.trim() || "Novo catálogo";
    const catalogo = await createConviteiraWithDefaults({
      clerkUserId: conviteira.clerkUserId,
      nomeMarca,
      whatsapp: conviteira.whatsapp || "5500000000000"
    });
    const response = NextResponse.json(
      { catalogo: toCatalogoResumo(catalogo) },
      { status: 201 }
    );

    response.cookies.set(ACTIVE_CATALOGO_COOKIE, catalogo.id, {
      path: "/",
      sameSite: "lax"
    });

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

function toCatalogoResumo(catalogo: {
  id: string;
  nomeMarca: string;
  slug: string;
}) {
  return {
    id: catalogo.id,
    nomeMarca: catalogo.nomeMarca,
    slug: catalogo.slug
  };
}
