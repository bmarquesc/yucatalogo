import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { getTiposForConviteira } from "@/db/queries";
import { tiposConvite } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import type { ModoDisplay } from "@/types/catalog";

export const dynamic = "force-dynamic";

type TipoPayload = {
  nome?: string;
  nomePublico?: string;
  descricaoPublica?: string | null;
  emoji?: string | null;
  modoDisplay?: ModoDisplay;
  ordem?: number;
};

export async function GET() {
  try {
    const { conviteira } = await requireConviteira();
    const tipos = await getTiposForConviteira(conviteira.id);
    return NextResponse.json({ tipos });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<TipoPayload>(request);
    const nomePublico = body.nomePublico?.trim() || body.nome?.trim();

    if (!nomePublico) {
      return jsonError("Nome público é obrigatório.");
    }

    const [tipo] = await getDb()
      .insert(tiposConvite)
      .values({
        conviteiraId: conviteira.id,
        nome: body.nome?.trim() || nomePublico,
        nomePublico,
        descricaoPublica: body.descricaoPublica?.trim() || null,
        emoji: body.emoji?.trim() || "🎉",
        modoDisplay: body.modoDisplay || "lista",
        ordem: body.ordem ?? 0
      })
      .returning();

    return NextResponse.json({ tipo }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
