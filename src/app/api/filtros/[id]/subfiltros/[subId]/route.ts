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

export async function PUT(
  request: Request,
  { params }: { params: { id: string; subId: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<SubfiltroPayload>(request);

    if (body.nome !== undefined && !body.nome.trim()) {
      return jsonError("Nome do subfiltro e obrigatorio.");
    }

    const filterExists = await ensureFilter(params.id, conviteira.id);

    if (!filterExists) {
      return jsonError("Filtro nao encontrado.", 404);
    }

    const [subfiltro] = await getDb()
      .update(subfiltrosCatalogo)
      .set({
        nome: body.nome?.trim(),
        ordem: body.ordem
      })
      .where(
        and(
          eq(subfiltrosCatalogo.id, params.subId),
          eq(subfiltrosCatalogo.filtroId, params.id)
        )
      )
      .returning();

    if (!subfiltro) {
      return jsonError("Subfiltro nao encontrado.", 404);
    }

    return NextResponse.json({ subfiltro });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; subId: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const filterExists = await ensureFilter(params.id, conviteira.id);

    if (!filterExists) {
      return jsonError("Filtro nao encontrado.", 404);
    }

    const [deleted] = await getDb()
      .delete(subfiltrosCatalogo)
      .where(
        and(
          eq(subfiltrosCatalogo.id, params.subId),
          eq(subfiltrosCatalogo.filtroId, params.id)
        )
      )
      .returning();

    if (!deleted) {
      return jsonError("Subfiltro nao encontrado.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function ensureFilter(filtroId: string, conviteiraId: string) {
  const [filtro] = await getDb()
    .select({ id: filtrosCatalogo.id })
    .from(filtrosCatalogo)
    .where(
      and(
        eq(filtrosCatalogo.id, filtroId),
        eq(filtrosCatalogo.conviteiraId, conviteiraId)
      )
    )
    .limit(1);

  return Boolean(filtro);
}
