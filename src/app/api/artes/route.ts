import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { getAdminArtes } from "@/db/queries";
import {
  arteMidias,
  arteSubfiltros,
  artes,
  filtrosCatalogo,
  subfiltrosCatalogo
} from "@/db/schema";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import type { TipoMidia } from "@/types/catalog";

export const dynamic = "force-dynamic";

type ArtePayload = {
  nome?: string;
  tipoId?: string | null;
  tema?: string | null;
  emoji?: string | null;
  canvaUrl?: string | null;
  linkPublicado?: string | null;
  valor?: number | null;
  valorAPartir?: boolean | null;
  ordem?: number;
  subfiltroIds?: string[] | null;
  midias?: Array<{
    tipo: TipoMidia;
    url: string;
    r2Key: string;
    ordem: number;
  }>;
};

export async function GET() {
  try {
    const { conviteira } = await requireConviteira();
    const data = await getAdminArtes(conviteira.id);
    return NextResponse.json({ artes: data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<ArtePayload>(request);

    if (!body.nome?.trim()) {
      return jsonError("Nome da arte é obrigatório.");
    }

    const imageCount =
      body.midias?.filter((media) => media.tipo === "imagem").length ?? 0;
    const videoCount =
      body.midias?.filter((media) => media.tipo === "video").length ?? 0;

    if (imageCount > 10) {
      return jsonError("Cada convite pode ter no máximo 10 fotos.");
    }

    if (videoCount > 1) {
      return jsonError("Cada convite pode ter no máximo 1 vídeo.");
    }

    const subfiltroIds = await resolveSubfiltroIds(
      conviteira.id,
      body.subfiltroIds
    );

    if (!subfiltroIds) {
      return jsonError("Subfiltro nao encontrado.", 404);
    }

    const db = getDb();
    const [created] = await db
      .insert(artes)
      .values({
        conviteiraId: conviteira.id,
        nome: body.nome.trim(),
        tipoId: body.tipoId || null,
        tema: body.tema?.trim() || null,
        emoji: body.emoji?.trim() || "🎉",
        canvaUrl: body.canvaUrl?.trim() || null,
        linkPublicado: body.linkPublicado?.trim() || null,
        valor: sanitizeOptionalMoney(body.valor),
        valorAPartir: Boolean(body.valorAPartir),
        ordem: body.ordem ?? 0
      })
      .returning();

    if (body.midias?.length) {
      await db.insert(arteMidias).values(
        body.midias.map((media, index) => ({
          arteId: created.id,
          tipo: media.tipo,
          url: media.url,
          r2Key: media.r2Key,
          ordem: media.ordem ?? index
        }))
      );
    }

    if (subfiltroIds.length) {
      await db.insert(arteSubfiltros).values(
        subfiltroIds.map((subfiltroId) => ({
          arteId: created.id,
          subfiltroId
        }))
      );
    }

    return NextResponse.json({ arte: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function resolveSubfiltroIds(
  conviteiraId: string,
  value: string[] | null | undefined
) {
  const requested = Array.from(
    new Set((value ?? []).filter((id) => typeof id === "string" && id.trim()))
  );

  if (!requested.length) {
    return [];
  }

  const rows = await getDb()
    .select({ id: subfiltrosCatalogo.id })
    .from(subfiltrosCatalogo)
    .innerJoin(
      filtrosCatalogo,
      eq(subfiltrosCatalogo.filtroId, filtrosCatalogo.id)
    )
    .where(
      and(
        eq(filtrosCatalogo.conviteiraId, conviteiraId),
        inArray(subfiltrosCatalogo.id, requested)
      )
    );

  if (rows.length !== requested.length) {
    return null;
  }

  return rows.map((row) => row.id);
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
