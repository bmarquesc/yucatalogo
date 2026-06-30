import { asc, eq, inArray, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  arteMidias,
  artes,
  camposPedido,
  conviteiras,
  tiposConvite
} from "@/db/schema";
import { DEFAULT_CAMPOS_PEDIDO, DEFAULT_TIPOS_CONVITE } from "@/lib/defaults";
import { slugify } from "@/lib/slug";
import type {
  CatalogArte,
  CatalogCampo,
  CatalogMedia,
  CatalogTipo,
  PublicCatalog
} from "@/types/catalog";

export async function getConviteiraByUserId(userId: string) {
  const [conviteira] = await getDb()
    .select()
    .from(conviteiras)
    .where(eq(conviteiras.clerkUserId, userId))
    .limit(1);

  return conviteira ?? null;
}

export async function getConviteiraBySlug(slug: string) {
  const [conviteira] = await getDb()
    .select()
    .from(conviteiras)
    .where(eq(conviteiras.slug, slug))
    .limit(1);

  return conviteira ?? null;
}

export async function isSlugAvailable(slug: string, currentConviteiraId?: string) {
  const [existing] = await getDb()
    .select({ id: conviteiras.id })
    .from(conviteiras)
    .where(
      currentConviteiraId
        ? eq(conviteiras.slug, slug)
        : eq(conviteiras.slug, slug)
    )
    .limit(1);

  return !existing || existing.id === currentConviteiraId;
}

export async function createUniqueSlug(base: string) {
  const db = getDb();
  const root = slugify(base);
  let candidate = root;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: conviteiras.id })
      .from(conviteiras)
      .where(eq(conviteiras.slug, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }

    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
}

export async function createConviteiraWithDefaults(input: {
  clerkUserId: string;
  nomeMarca: string;
  whatsapp: string;
}) {
  const db = getDb();
  const slug = await createUniqueSlug(input.nomeMarca);
  const [conviteira] = await db
    .insert(conviteiras)
    .values({
      clerkUserId: input.clerkUserId,
      slug,
      nomeMarca: input.nomeMarca,
      whatsapp: input.whatsapp || "5500000000000"
    })
    .returning();

  await db.insert(camposPedido).values(
    DEFAULT_CAMPOS_PEDIDO.map((campo) => ({
      ...campo,
      conviteiraId: conviteira.id
    }))
  );

  await db.insert(tiposConvite).values(
    DEFAULT_TIPOS_CONVITE.map((tipo) => ({
      ...tipo,
      conviteiraId: conviteira.id
    }))
  );

  return conviteira;
}

export async function updateConviteira(
  conviteiraId: string,
  input: {
    nomeMarca?: string;
    slug?: string;
    bio?: string | null;
    whatsapp?: string;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    corPrincipal?: string;
    corDestaque?: string;
  }
) {
  const data = {
    nomeMarca: input.nomeMarca,
    slug: input.slug ? slugify(input.slug) : undefined,
    bio: input.bio,
    whatsapp: input.whatsapp,
    logoUrl: input.logoUrl,
    bannerUrl: input.bannerUrl,
    corPrincipal: input.corPrincipal,
    corDestaque: input.corDestaque
  };

  if (data.slug) {
    const [existing] = await getDb()
      .select({ id: conviteiras.id })
      .from(conviteiras)
      .where(eq(conviteiras.slug, data.slug))
      .limit(1);

    if (existing && existing.id !== conviteiraId) {
      throw new Error("SLUG_IN_USE");
    }
  }

  const [updated] = await getDb()
    .update(conviteiras)
    .set(data)
    .where(eq(conviteiras.id, conviteiraId))
    .returning();

  return updated;
}

export async function getTiposForConviteira(conviteiraId: string) {
  return getDb()
    .select()
    .from(tiposConvite)
    .where(eq(tiposConvite.conviteiraId, conviteiraId))
    .orderBy(asc(tiposConvite.ordem), asc(tiposConvite.nomePublico));
}

export async function getCamposForConviteira(conviteiraId: string) {
  return getDb()
    .select()
    .from(camposPedido)
    .where(eq(camposPedido.conviteiraId, conviteiraId))
    .orderBy(asc(camposPedido.ordem), asc(camposPedido.label));
}

export async function getAdminArtes(conviteiraId: string): Promise<CatalogArte[]> {
  const [arteRows, tipoRows] = await Promise.all([
    getDb()
      .select()
      .from(artes)
      .where(eq(artes.conviteiraId, conviteiraId))
      .orderBy(asc(artes.ordem), asc(artes.nome)),
    getTiposForConviteira(conviteiraId)
  ]);

  const mediaRows = arteRows.length
    ? await getDb()
        .select()
        .from(arteMidias)
        .where(
          inArray(
            arteMidias.arteId,
            arteRows.map((arte) => arte.id)
          )
        )
        .orderBy(asc(arteMidias.ordem))
    : [];

  const tipoById = new Map(tipoRows.map((tipo) => [tipo.id, toCatalogTipo(tipo)]));
  const mediaByArte = groupMediaByArte(mediaRows);

  return arteRows.map((arte) => ({
    id: arte.id,
    tipoId: arte.tipoId,
    nome: arte.nome,
    tema: arte.tema,
    emoji: arte.emoji,
    canvaUrl: arte.canvaUrl,
    linkPublicado: arte.linkPublicado,
    ordem: arte.ordem,
    ativo: arte.ativo,
    tipo: arte.tipoId ? tipoById.get(arte.tipoId) ?? null : null,
    midias: mediaByArte.get(arte.id) ?? []
  }));
}

export async function getPublicCatalog(slug: string): Promise<PublicCatalog | null> {
  const conviteira = await getConviteiraBySlug(slug);

  if (!conviteira) {
    return null;
  }

  const [tipoRows, campoRows, arteRows] = await Promise.all([
    getTiposForConviteira(conviteira.id),
    getCamposForConviteira(conviteira.id),
    getDb()
      .select()
      .from(artes)
      .where(eq(artes.conviteiraId, conviteira.id))
      .orderBy(asc(artes.ordem), asc(artes.nome))
  ]);

  const activeArtes = arteRows.filter((arte) => arte.ativo);
  const mediaRows = activeArtes.length
    ? await getDb()
        .select()
        .from(arteMidias)
        .where(
          inArray(
            arteMidias.arteId,
            activeArtes.map((arte) => arte.id)
          )
        )
        .orderBy(asc(arteMidias.ordem))
    : [];

  const tipoById = new Map(tipoRows.map((tipo) => [tipo.id, toCatalogTipo(tipo)]));
  const mediaByArte = groupMediaByArte(mediaRows);

  return {
    conviteira: {
      id: conviteira.id,
      slug: conviteira.slug,
      nomeMarca: conviteira.nomeMarca,
      bio: conviteira.bio,
      whatsapp: conviteira.whatsapp,
      logoUrl: conviteira.logoUrl,
      bannerUrl: conviteira.bannerUrl,
      corPrincipal: conviteira.corPrincipal,
      corDestaque: conviteira.corDestaque
    },
    tipos: tipoRows.map(toCatalogTipo),
    artes: activeArtes.map((arte) => ({
      id: arte.id,
      tipoId: arte.tipoId,
      nome: arte.nome,
      tema: arte.tema,
      emoji: arte.emoji,
      linkPublicado: arte.linkPublicado,
      ordem: arte.ordem,
      ativo: arte.ativo,
      tipo: arte.tipoId ? tipoById.get(arte.tipoId) ?? null : null,
      midias: mediaByArte.get(arte.id) ?? []
    })),
    campos: campoRows.map(toCatalogCampo)
  };
}

function groupMediaByArte(rows: Array<typeof arteMidias.$inferSelect>) {
  return rows.reduce((map, media) => {
    const list = map.get(media.arteId) ?? [];
    list.push({
      id: media.id,
      tipo: media.tipo as CatalogMedia["tipo"],
      url: media.url,
      r2Key: media.r2Key,
      ordem: media.ordem
    });
    map.set(media.arteId, list);
    return map;
  }, new Map<string, CatalogMedia[]>());
}

function toCatalogTipo(tipo: typeof tiposConvite.$inferSelect): CatalogTipo {
  return {
    id: tipo.id,
    nome: tipo.nome,
    nomePublico: tipo.nomePublico,
    descricaoPublica: tipo.descricaoPublica,
    emoji: tipo.emoji,
    modoDisplay: tipo.modoDisplay,
    ordem: tipo.ordem
  };
}

function toCatalogCampo(campo: typeof camposPedido.$inferSelect): CatalogCampo {
  return {
    id: campo.id,
    label: campo.label,
    tipo: campo.tipo,
    opcoes: campo.opcoes,
    obrigatorio: campo.obrigatorio,
    ordem: campo.ordem
  };
}
