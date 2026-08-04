import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { filtrosCatalogo } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

type FiltroPayload = {
  nome?: string;
  ordem?: number;
};

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<FiltroPayload>(request);

    if (body.nome !== undefined && !body.nome.trim()) {
      return jsonError("Nome do filtro e obrigatorio.");
    }

    const [filtro] = await getDb()
      .update(filtrosCatalogo)
      .set({
        nome: body.nome?.trim(),
        ordem: body.ordem
      })
      .where(
        and(
          eq(filtrosCatalogo.id, params.id),
          eq(filtrosCatalogo.conviteiraId, conviteira.id)
        )
      )
      .returning();

    if (!filtro) {
      return jsonError("Filtro nao encontrado.", 404);
    }

    return NextResponse.json({ filtro });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const [deleted] = await getDb()
      .delete(filtrosCatalogo)
      .where(
        and(
          eq(filtrosCatalogo.id, params.id),
          eq(filtrosCatalogo.conviteiraId, conviteira.id)
        )
      )
      .returning();

    if (!deleted) {
      return jsonError("Filtro nao encontrado.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
