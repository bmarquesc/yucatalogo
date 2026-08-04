import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { getFiltrosForConviteira } from "@/db/queries";
import { filtrosCatalogo } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

type FiltroPayload = {
  nome?: string;
  ordem?: number;
};

export async function GET() {
  try {
    const { conviteira } = await requireConviteira();
    const filtros = await getFiltrosForConviteira(conviteira.id);
    return NextResponse.json({ filtros });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<FiltroPayload>(request);
    const nome = body.nome?.trim();

    if (!nome) {
      return jsonError("Nome do filtro e obrigatorio.");
    }

    const [filtro] = await getDb()
      .insert(filtrosCatalogo)
      .values({
        conviteiraId: conviteira.id,
        nome,
        ordem: body.ordem ?? 0
      })
      .returning();

    return NextResponse.json(
      { filtro: { ...filtro, subfiltros: [] } },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
