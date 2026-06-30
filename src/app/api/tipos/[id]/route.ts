import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { tiposConvite } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import type { ModoDisplay } from "@/types/catalog";

export const dynamic = "force-dynamic";

type TipoUpdatePayload = {
  nome?: string;
  nomePublico?: string;
  descricaoPublica?: string | null;
  emoji?: string | null;
  modoDisplay?: ModoDisplay;
  ordem?: number;
};

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<TipoUpdatePayload>(request);

    if (body.nomePublico !== undefined && !body.nomePublico.trim()) {
      return jsonError("Nome público é obrigatório.");
    }

    const [tipo] = await getDb()
      .update(tiposConvite)
      .set({
        nome: body.nome?.trim(),
        nomePublico: body.nomePublico?.trim(),
        descricaoPublica:
          body.descricaoPublica === undefined
            ? undefined
            : body.descricaoPublica?.trim() || null,
        emoji: body.emoji === undefined ? undefined : body.emoji?.trim() || "🎉",
        modoDisplay: body.modoDisplay,
        ordem: body.ordem
      })
      .where(and(eq(tiposConvite.id, params.id), eq(tiposConvite.conviteiraId, conviteira.id)))
      .returning();

    if (!tipo) {
      return jsonError("Tipo não encontrado.", 404);
    }

    return NextResponse.json({ tipo });
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
      .delete(tiposConvite)
      .where(and(eq(tiposConvite.id, params.id), eq(tiposConvite.conviteiraId, conviteira.id)))
      .returning();

    if (!deleted) {
      return jsonError("Tipo não encontrado.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
