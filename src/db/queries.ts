import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  arteMidias,
  artes,
  camposPedido,
  conviteiras,
  gastosCaixa,
  pedidos,
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
import type { CaixaData, CaixaGasto, CaixaPedido } from "@/types/caixa";
import type { ProducaoData, ProducaoPedido } from "@/types/producao";

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

export async function getFirstConviteira() {
  const [conviteira] = await getDb()
    .select()
    .from(conviteiras)
    .orderBy(asc(conviteiras.criadoEm))
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
    fonteCatalogo?: string;
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
    corDestaque: input.corDestaque,
    fonteCatalogo: input.fonteCatalogo
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

export async function getCaixaForConviteira(
  conviteiraId: string,
  month: string
): Promise<CaixaData> {
  const normalizedMonth = normalizeMonth(month);

  const [pedidoRows, gastoRows] = await Promise.all([
    getDb()
      .select()
      .from(pedidos)
      .where(eq(pedidos.conviteiraId, conviteiraId))
      .orderBy(asc(pedidos.dataEntrega), asc(pedidos.clienteNome)),
    getDb()
      .select()
      .from(gastosCaixa)
      .where(eq(gastosCaixa.conviteiraId, conviteiraId))
      .orderBy(asc(gastosCaixa.dataGasto), asc(gastosCaixa.descricao))
  ]);

  const pedidosData = pedidoRows
    .map(toCaixaPedido)
    .filter((pedido) => isInMonth(pedido.dataPedido, normalizedMonth));
  const gastosData = gastoRows
    .map(toCaixaGasto)
    .filter((gasto) => isInMonth(gasto.dataGasto, normalizedMonth));
  const pedidosAtivos = pedidosData.filter((pedido) => pedido.status !== "cancelado");
  const bruto = sumCurrency(pedidosAtivos.map((pedido) => pedido.valorTotal));
  const recebido = sumCurrency(pedidosAtivos.map((pedido) => pedido.valorPago));
  const gastos = sumCurrency(gastosData.map((gasto) => gasto.valor));

  return {
    mes: normalizedMonth,
    resumo: {
      bruto,
      recebido,
      aReceber: Math.max(bruto - recebido, 0),
      gastos,
      liquido: recebido - gastos,
      pedidosBalcaoCount: pedidosAtivos.filter(
        (pedido) => normalizeOrigemPedido(pedido.origem) === "balcao"
      ).length,
      pedidosCatalogoCount: pedidosAtivos.filter(
        (pedido) => normalizeOrigemPedido(pedido.origem) === "catalogo"
      ).length,
      pedidosCount: pedidosAtivos.length
    },
    pedidos: pedidosData,
    gastos: gastosData
  };
}

export async function getProducaoForTag(
  slug: string,
  tag: string
): Promise<ProducaoData | null> {
  const conviteira = await getConviteiraBySlug(slug);

  if (!conviteira) {
    return null;
  }

  const normalizedTag = tag.trim();
  const allPedidoRows = await getDb()
    .select()
    .from(pedidos)
    .where(
      and(
        eq(pedidos.conviteiraId, conviteira.id),
        ne(pedidos.status, "cancelado")
      )
    )
    .orderBy(asc(pedidos.tag), asc(pedidos.dataEntrega), asc(pedidos.clienteNome));

  const pedidoRows =
    normalizedTag.length >= 2
      ? allPedidoRows.filter((pedido) => matchesTag(pedido.tag, normalizedTag))
      : allPedidoRows;

  const arteIds = Array.from(
    new Set(
      pedidoRows
        .map((pedido) => pedido.arteId)
        .filter((arteId): arteId is string => Boolean(arteId))
    )
  );

  const [arteRows, tipoRows, mediaRows] = await Promise.all([
    arteIds.length
      ? getDb()
          .select()
          .from(artes)
          .where(inArray(artes.id, arteIds))
      : [],
    getTiposForConviteira(conviteira.id),
    arteIds.length
      ? getDb()
          .select()
          .from(arteMidias)
          .where(inArray(arteMidias.arteId, arteIds))
          .orderBy(asc(arteMidias.ordem))
      : []
  ]);

  const arteById = new Map(arteRows.map((arte) => [arte.id, arte]));
  const tipoById = new Map(tipoRows.map((tipo) => [tipo.id, tipo]));
  const mediaByArte = groupMediaByArte(mediaRows);

  const producaoPedidos = pedidoRows.map((pedido) => {
    const arte = pedido.arteId ? arteById.get(pedido.arteId) : null;
    const tipo = arte?.tipoId ? tipoById.get(arte.tipoId) : null;
    const media = arte ? mediaByArte.get(arte.id) ?? [] : [];
    const cover =
      media.find((item) => item.tipo === "imagem") ?? media[0] ?? null;

    return {
      id: pedido.id,
      clienteNome: pedido.clienteNome,
      tag: pedido.tag,
      statusProducao: pedido.statusProducao ?? "a_fazer",
      arteNome: pedido.arteNome || arte?.nome || null,
      arteTema: arte?.tema ?? null,
      tipoNomePublico: tipo?.nomePublico ?? null,
      canvaUrl: arte?.canvaUrl ?? null,
      midiaUrl: cover?.url ?? null,
      dataPedido: pedido.dataPedido,
      dataEntrega: pedido.dataEntrega,
      observacoes: pedido.observacoes
    };
  });

  return {
    conviteira: {
      slug: conviteira.slug,
      nomeMarca: conviteira.nomeMarca,
      logoUrl: conviteira.logoUrl,
      corPrincipal: conviteira.corPrincipal,
      corDestaque: conviteira.corDestaque
    },
    tag: normalizedTag,
    grupos: groupProducaoByTag(producaoPedidos),
    pedidos: producaoPedidos
  };
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
    valor: arte.valor,
    valorAPartir: arte.valorAPartir,
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
      corDestaque: conviteira.corDestaque,
      fonteCatalogo: conviteira.fonteCatalogo
    },
    tipos: tipoRows.map(toCatalogTipo),
    artes: activeArtes.map((arte) => ({
      id: arte.id,
      tipoId: arte.tipoId,
      nome: arte.nome,
      tema: arte.tema,
      emoji: arte.emoji,
      linkPublicado: arte.linkPublicado,
      valor: arte.valor,
      valorAPartir: arte.valorAPartir,
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

function normalizeMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month)
    ? month
    : new Date().toISOString().slice(0, 7);
}

function isInMonth(date: string | null | undefined, month: string) {
  return Boolean(date?.startsWith(month));
}

function matchesTag(tag: string | null, query: string) {
  if (!tag) {
    return false;
  }

  const normalizedTag = normalizeText(tag);
  const normalizedQuery = normalizeText(query);
  const tagParts = normalizedTag.split(/[,\s;/|]+/).filter(Boolean);

  return (
    normalizedTag === normalizedQuery ||
    normalizedTag.startsWith(normalizedQuery) ||
    tagParts.some((part) => part.startsWith(normalizedQuery))
  );
}

function groupProducaoByTag(pedidosData: ProducaoPedido[]) {
  const groups = pedidosData.reduce((map, pedido) => {
    const tag = pedido.tag?.trim() || "Sem tag";
    const group = map.get(tag) ?? [];
    group.push(pedido);
    map.set(tag, group);
    return map;
  }, new Map<string, ProducaoPedido[]>());

  return Array.from(groups.entries()).map(([tag, groupPedidos]) => ({
    tag,
    pedidos: groupPedidos
  }));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sumCurrency(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function toCaixaPedido(pedido: typeof pedidos.$inferSelect): CaixaPedido {
  return {
    id: pedido.id,
    arteId: pedido.arteId,
    clienteNome: pedido.clienteNome,
    clienteWhatsapp: pedido.clienteWhatsapp,
    tag: pedido.tag,
    arteNome: pedido.arteNome,
    origem: normalizeOrigemPedido(pedido.origem),
    valorTotal: pedido.valorTotal,
    valorPago: pedido.valorPago,
    status: pedido.status,
    dataPedido: pedido.dataPedido,
    dataEntrega: pedido.dataEntrega,
    observacoes: pedido.observacoes
  };
}

function normalizeOrigemPedido(origem: string | null | undefined) {
  return origem === "catalogo" ? "catalogo" : "balcao";
}

function toCaixaGasto(gasto: typeof gastosCaixa.$inferSelect): CaixaGasto {
  return {
    id: gasto.id,
    descricao: gasto.descricao,
    categoria: gasto.categoria,
    valor: gasto.valor,
    dataGasto: gasto.dataGasto,
    observacoes: gasto.observacoes
  };
}
