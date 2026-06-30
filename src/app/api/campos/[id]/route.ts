import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { camposPedido } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import type { TipoCampoPedido } from "@/types/catalog";

export const dynamic = "force-dynamic";

type CampoUpdatePayload = {
  label?: string;
  tipo?: TipoCampoPedido;
  opcoes?: string[] | null;
  obrigatorio?: boolean;
  ordem?: number;
};

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<CampoUpdatePayload>(request);

    if (body.label !== undefined && !body.label.trim()) {
      return jsonError("Label é obrigatório.");
    }

    const [campo] = await getDb()
      .update(camposPedido)
      .set({
        label: body.label?.trim(),
        tipo: body.tipo,
        opcoes:
          body.opcoes === undefined
            ? undefined
            : body.tipo === "select"
              ? body.opcoes
              : null,
        obrigatorio: body.obrigatorio,
        ordem: body.ordem
      })
      .where(and(eq(camposPedido.id, params.id), eq(camposPedido.conviteiraId, conviteira.id)))
      .returning();

    if (!campo) {
      return jsonError("Campo não encontrado.", 404);
    }

    return NextResponse.json({ campo });
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
      .delete(camposPedido)
      .where(and(eq(camposPedido.id, params.id), eq(camposPedido.conviteiraId, conviteira.id)))
      .returning();

    if (!deleted) {
      return jsonError("Campo não encontrado.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
