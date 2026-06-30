import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { arteMidias, artes } from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import type { TipoMidia } from "@/types/catalog";

export const dynamic = "force-dynamic";

type MidiaPayload = {
  arteId?: string;
  tipo?: TipoMidia;
  url?: string;
  r2Key?: string;
  ordem?: number;
};

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<MidiaPayload>(request);

    if (!body.arteId || !body.url || !body.r2Key) {
      return jsonError("Dados da mídia incompletos.");
    }

    if (body.tipo !== "imagem" && body.tipo !== "video") {
      return jsonError("Tipo de mídia inválido.");
    }

    const [arte] = await getDb()
      .select({ id: artes.id })
      .from(artes)
      .where(and(eq(artes.id, body.arteId), eq(artes.conviteiraId, conviteira.id)))
      .limit(1);

    if (!arte) {
      return jsonError("Arte não encontrada.", 404);
    }

    const [media] = await getDb()
      .insert(arteMidias)
      .values({
        arteId: body.arteId,
        tipo: body.tipo,
        url: body.url,
        r2Key: body.r2Key,
        ordem: body.ordem ?? 0
      })
      .returning();

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
