import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { gastosCaixa } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

type GastoPayload = {
  descricao?: string;
  categoria?: string | null;
  valor?: number;
  dataGasto?: string | null;
  observacoes?: string | null;
};

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<GastoPayload>(request);

    if (!body.descricao?.trim()) {
      return jsonError("Descrição do gasto é obrigatória.");
    }

    const [gasto] = await getDb()
      .insert(gastosCaixa)
      .values({
        conviteiraId: conviteira.id,
        descricao: body.descricao.trim(),
        categoria: body.categoria?.trim() || null,
        valor: sanitizeMoney(body.valor),
        dataGasto: normalizeDate(body.dataGasto) || today(),
        observacoes: body.observacoes?.trim() || null
      })
      .returning();

    return NextResponse.json({ gasto }, { status: 201 });
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

function normalizeDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
