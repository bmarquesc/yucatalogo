import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { pedidoRecebimentos, pedidos } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import {
  sanitizeOrderServices,
  sanitizeOrderServiceValues
} from "@/lib/orderServices";
import {
  normalizeDate,
  resolvePedidoStatus,
  sanitizeMoney,
  sanitizePedidoRecebimentos,
  sumPedidoRecebimentos,
  today
} from "@/lib/pedidoRecebimentos";
import type { OrigemPedido, StatusPedido } from "@/types/caixa";

export const dynamic = "force-dynamic";

type PedidoPayload = {
  arteId?: string | null;
  clienteNome?: string;
  clienteWhatsapp?: string | null;
  tag?: string | null;
  arteNome?: string | null;
  valorTotal?: number;
  valorPago?: number;
  recebimentos?: unknown;
  origem?: OrigemPedido | null;
  status?: StatusPedido;
  servicosAdicionais?: string[] | null;
  servicosOutros?: string | null;
  servicosValores?: Record<string, number> | null;
  dataPedido?: string | null;
  dataEntrega?: string | null;
  observacoes?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<PedidoPayload>(request);

    if (!body.clienteNome?.trim()) {
      return jsonError("Nome da cliente Ã© obrigatÃ³rio.");
    }

    const clienteNome = body.clienteNome.trim();
    const valorTotal = sanitizeMoney(body.valorTotal);
    const dataPedido = normalizeDate(body.dataPedido) || today();
    const recebimentos = sanitizePedidoRecebimentos(
      body.recebimentos,
      sanitizeMoney(body.valorPago),
      dataPedido
    );
    const valorPago = sumPedidoRecebimentos(recebimentos);
    const status = resolvePedidoStatus(body.status, valorTotal, valorPago);
    const servicosAdicionais = sanitizeOrderServices(body.servicosAdicionais);
    const servicosOutros = body.servicosOutros?.trim() || null;

    const pedido = await getDb().transaction(async (tx) => {
      const [updated] = await tx
        .update(pedidos)
        .set({
          arteId: body.arteId || null,
          clienteNome,
          clienteWhatsapp: body.clienteWhatsapp?.trim() || null,
          tag: body.tag?.trim() || null,
          arteNome: body.arteNome?.trim() || null,
          origem: resolveOrigem(body.origem),
          valorTotal,
          valorPago,
          status,
          servicosAdicionais: servicosAdicionais.length
            ? servicosAdicionais
            : null,
          servicosOutros,
          servicosValores: sanitizeOrderServiceValues(
            body.servicosValores,
            servicosAdicionais,
            servicosOutros
          ),
          dataPedido,
          dataEntrega: normalizeDate(body.dataEntrega),
          observacoes: body.observacoes?.trim() || null
        })
        .where(
          and(eq(pedidos.id, params.id), eq(pedidos.conviteiraId, conviteira.id))
        )
        .returning();

      if (!updated) {
        return null;
      }

      await tx
        .delete(pedidoRecebimentos)
        .where(eq(pedidoRecebimentos.pedidoId, params.id));

      if (recebimentos.length) {
        await tx.insert(pedidoRecebimentos).values(
          recebimentos.map((recebimento) => ({
            pedidoId: updated.id,
            valor: recebimento.valor,
            dataRecebimento: recebimento.dataRecebimento,
            descricao: recebimento.descricao
          }))
        );
      }

      return updated;
    });

    if (!pedido) {
      return jsonError("Pedido nÃ£o encontrado.", 404);
    }

    return NextResponse.json({ pedido: { ...pedido, recebimentos } });
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
      .delete(pedidos)
      .where(and(eq(pedidos.id, params.id), eq(pedidos.conviteiraId, conviteira.id)))
      .returning();

    if (!deleted) {
      return jsonError("Pedido não encontrado.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

function resolveOrigem(origem: OrigemPedido | null | undefined): OrigemPedido {
  return origem === "catalogo" ? "catalogo" : "balcao";
}
