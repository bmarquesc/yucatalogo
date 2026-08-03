import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { pedidos } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import { sanitizeOrderServices } from "@/lib/orderServices";
import type { OrigemPedido, StatusPedido } from "@/types/caixa";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: StatusPedido[] = [
  "em_aberto",
  "sinal_pago",
  "pago",
  "cancelado"
];

type PedidoPayload = {
  arteId?: string | null;
  clienteNome?: string;
  clienteWhatsapp?: string | null;
  tag?: string | null;
  arteNome?: string | null;
  valorTotal?: number;
  valorPago?: number;
  origem?: OrigemPedido | null;
  status?: StatusPedido;
  servicosAdicionais?: string[] | null;
  servicosOutros?: string | null;
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

    const valorTotal = sanitizeMoney(body.valorTotal);
    const valorPago = sanitizeMoney(body.valorPago);
    const status = resolveStatus(body.status, valorTotal, valorPago);
    const servicosAdicionais = sanitizeOrderServices(body.servicosAdicionais);

    const [pedido] = await getDb()
      .update(pedidos)
      .set({
        arteId: body.arteId || null,
        clienteNome: body.clienteNome.trim(),
        clienteWhatsapp: body.clienteWhatsapp?.trim() || null,
        tag: body.tag?.trim() || null,
        arteNome: body.arteNome?.trim() || null,
        origem: resolveOrigem(body.origem),
        valorTotal,
        valorPago,
        status,
        servicosAdicionais: servicosAdicionais.length ? servicosAdicionais : null,
        servicosOutros: body.servicosOutros?.trim() || null,
        dataPedido: normalizeDate(body.dataPedido) || today(),
        dataEntrega: normalizeDate(body.dataEntrega),
        observacoes: body.observacoes?.trim() || null
      })
      .where(and(eq(pedidos.id, params.id), eq(pedidos.conviteiraId, conviteira.id)))
      .returning();

    if (!pedido) {
      return jsonError("Pedido nÃ£o encontrado.", 404);
    }

    return NextResponse.json({ pedido });
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

function sanitizeMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}

function resolveStatus(
  status: StatusPedido | undefined,
  valorTotal: number,
  valorPago: number
): StatusPedido {
  if (status && STATUS_OPTIONS.includes(status)) {
    return status;
  }

  if (valorTotal > 0 && valorPago >= valorTotal) {
    return "pago";
  }

  if (valorPago > 0) {
    return "sinal_pago";
  }

  return "em_aberto";
}

function resolveOrigem(origem: OrigemPedido | null | undefined): OrigemPedido {
  return origem === "catalogo" ? "catalogo" : "balcao";
}

function normalizeDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
