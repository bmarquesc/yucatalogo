import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { filtrosCatalogo, subfiltrosCatalogo } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SubfiltroPayload = {
  nome?: string;
  ordem?: number;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<SubfiltroPayload>(request);
    const nome = body.nome?.trim();

    if (!nome) {
      return jsonError("Nome do subfiltro e obrigatorio.");
    }

    const [filtro] = await getDb()
      .select({ id: filtrosCatalogo.id })
      .from(filtrosCatalogo)
      .where(
        and(
          eq(filtrosCatalogo.id, params.id),
          eq(filtrosCatalogo.conviteiraId, conviteira.id)
        )
      )
      .limit(1);

    if (!filtro) {
      return jsonError("Filtro nao encontrado.", 404);
    }

    const [subfiltro] = await getDb()
      .insert(subfiltrosCatalogo)
      .values({
        filtroId: filtro.id,
        nome,
        ordem: body.ordem ?? 0
      })
      .returning();

    return NextResponse.json({ subfiltro }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
