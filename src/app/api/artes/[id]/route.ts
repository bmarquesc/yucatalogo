import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { artes } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ArteUpdatePayload = {
  nome?: string;
  tipoId?: string | null;
  tema?: string | null;
  emoji?: string | null;
  canvaUrl?: string | null;
  linkPublicado?: string | null;
  valor?: number | null;
  valorAPartir?: boolean | null;
  ordem?: number;
  ativo?: boolean;
};

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<ArteUpdatePayload>(request);

    if (body.nome !== undefined && !body.nome.trim()) {
      return jsonError("Nome da arte é obrigatório.");
    }

    const [updated] = await getDb()
      .update(artes)
      .set({
        nome: body.nome?.trim(),
        tipoId: body.tipoId === undefined ? undefined : body.tipoId || null,
        tema: body.tema === undefined ? undefined : body.tema?.trim() || null,
        emoji: body.emoji === undefined ? undefined : body.emoji?.trim() || "🎉",
        canvaUrl:
          body.canvaUrl === undefined ? undefined : body.canvaUrl?.trim() || null,
        linkPublicado:
          body.linkPublicado === undefined
            ? undefined
            : body.linkPublicado?.trim() || null,
        valor:
          body.valor === undefined ? undefined : sanitizeOptionalMoney(body.valor),
        valorAPartir:
          body.valorAPartir === undefined ? undefined : Boolean(body.valorAPartir),
        ordem: body.ordem,
        ativo: body.ativo
      })
      .where(and(eq(artes.id, params.id), eq(artes.conviteiraId, conviteira.id)))
      .returning();

    if (!updated) {
      return jsonError("Arte não encontrada.", 404);
    }

    return NextResponse.json({ arte: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

function sanitizeOptionalMoney(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const [deleted] = await getDb()
      .delete(artes)
      .where(and(eq(artes.id, params.id), eq(artes.conviteiraId, conviteira.id)))
      .returning();

    if (!deleted) {
      return jsonError("Arte não encontrada.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
