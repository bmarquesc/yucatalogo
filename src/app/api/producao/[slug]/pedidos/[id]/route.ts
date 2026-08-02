import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { pedidos } from "@/db/schema";
import { getConviteiraBySlug } from "@/db/queries";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import type { StatusProducao } from "@/types/producao";

export const dynamic = "force-dynamic";

const STATUS_PRODUCAO_OPTIONS: StatusProducao[] = [
  "a_fazer",
  "fazendo",
  "pronto_enviado"
];

type StatusPayload = {
  statusProducao?: StatusProducao;
};

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const conviteira = await getConviteiraBySlug(params.slug);

    if (!conviteira) {
      return jsonError("Fila de produção não encontrada.", 404);
    }

    const body = await readJson<StatusPayload>(request);
    const statusProducao = body.statusProducao;

    if (!statusProducao || !STATUS_PRODUCAO_OPTIONS.includes(statusProducao)) {
      return jsonError("Status de produção inválido.");
    }

    const [pedido] = await getDb()
      .update(pedidos)
      .set({ statusProducao })
      .where(and(eq(pedidos.id, params.id), eq(pedidos.conviteiraId, conviteira.id)))
      .returning({ id: pedidos.id, statusProducao: pedidos.statusProducao });

    if (!pedido) {
      return jsonError("Pedido não encontrado.", 404);
    }

    return NextResponse.json({ pedido });
  } catch (error) {
    return handleRouteError(error);
  }
}
