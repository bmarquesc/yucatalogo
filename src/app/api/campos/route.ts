import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { getCamposForConviteira } from "@/db/queries";
import { camposPedido } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import type { TipoCampoPedido } from "@/types/catalog";

export const dynamic = "force-dynamic";

type CampoPayload = {
  label?: string;
  tipo?: TipoCampoPedido;
  opcoes?: string[] | null;
  obrigatorio?: boolean;
  ordem?: number;
};

export async function GET() {
  try {
    const { conviteira } = await requireConviteira();
    const campos = await getCamposForConviteira(conviteira.id);
    return NextResponse.json({ campos });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<CampoPayload>(request);

    if (!body.label?.trim()) {
      return jsonError("Label é obrigatório.");
    }

    if (
      !body.tipo ||
      !["texto", "data", "hora", "telefone", "textarea", "select"].includes(body.tipo)
    ) {
      return jsonError("Tipo de campo inválido.");
    }

    const [campo] = await getDb()
      .insert(camposPedido)
      .values({
        conviteiraId: conviteira.id,
        label: body.label.trim(),
        tipo: body.tipo,
        opcoes: body.tipo === "select" ? body.opcoes ?? [] : null,
        obrigatorio: body.obrigatorio ?? true,
        ordem: body.ordem ?? 0
      })
      .returning();

    return NextResponse.json({ campo }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
