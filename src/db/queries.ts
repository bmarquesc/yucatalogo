import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  acessosKiwify,
  arteMidias,
  arteSubfiltros,
  artes,
  camposPedido,
  conviteiras,
  filtrosCatalogo,
  gastosCaixa,
  pedidoRecebimentos,
  pedidos,
  subfiltrosCatalogo,
  tiposConvite
} from "@/db/schema";
import { DEFAULT_CAMPOS_PEDIDO, DEFAULT_TIPOS_CONVITE } from "@/lib/defaults";
import { slugify } from "@/lib/slug";
import type {
  CatalogArte,
  CatalogCampo,
  CatalogFiltro,
  CatalogMedia,
  CatalogSubfiltro,
  CatalogTipo,
  PublicCatalog
} from "@/types/catalog";
import type {
  CaixaData,
  CaixaGasto,
  CaixaPedido,
  CaixaRecebimento
} from "@/types/caixa";
import type { ProducaoData, ProducaoPedido } from "@/types/producao";

export async function getKiwifyAccessByEmail(email: string) {
  const [access] = await getDb()
    .select()
    .from(acessosKiwify)
    .where(eq(acessosKiwify.email, normalizeEmail(email)))
    .limit(1);

  return access ?? null;
}

export async function getActiveKiwifyAccessByEmail(email: string) {
  const access = await getKiwifyAccessByEmail(email);

  if (!access?.acessoAtivo) {
    return null;
  }

  if (access.validoAte && access.validoAte.getTime() < Date.now()) {
    return null;
  }

  return access;
}

export async function upsertKiwifyAccess(input: {
  email: string;
  nome?: string | null;
  telefone?: string | null;
  produtoId?: string | null;
  produtoNome?: string | null;
  pedidoId?: string | null;
  assinaturaId?: string | null;
  status: string;
  acessoAtivo: boolean;
  validoAte?: Date | null;
  ultimoEvento?: string | null;
  payload: Record<string, unknown>;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const data = {
    email: normalizedEmail,
    nome: input.nome ?? null,
    telefone: input.telefone ?? null,
    produtoId: input.produtoId ?? null,
    produtoNome: input.produtoNome ?? null,
    pedidoId: input.pedidoId ?? null,
    assinaturaId: input.assinaturaId ?? null,
    status: input.status,
    acessoAtivo: input.acessoAtivo,
    validoAte: input.validoAte ?? null,
    ultimoEvento: input.ultimoEvento ?? null,
    payload: input.payload
  };

  const [access] = await getDb()
    .insert(acessosKiwify)
    .values(data)
    .onConflictDoUpdate({
      target: acessosKiwify.email,
      set: {
        nome: data.nome,
        telefone: data.telefone,
        produtoId: data.produtoId,
        produtoNome: data.produtoNome,
        pedidoId: data.pedidoId,
        assinaturaId: data.assinaturaId,
        status: data.status,
        acessoAtivo: data.acessoAtivo,
        validoAte: data.validoAte,
        ultimoEvento: data.ultimoEvento,
        payload: data.payload,
        atualizadoEm: sql`NOW()`
      }
    })
    .returning();

  return access;
}

export async function getConviteiraByUserId(userId: string) {
  const [conviteira] = await getDb()
    .select()
    .from(conviteiras)
    .where(eq(conviteiras.clerkUserId, userId))
    .orderBy(asc(conviteiras.criadoEm))
    .limit(1);

  return conviteira ?? null;
}

export async function getConviteirasByUserId(userId: string) {
  return getDb()
    .select()
    .from(conviteiras)
    .where(eq(conviteiras.clerkUserId, userId))
    .orderBy(asc(conviteiras.criadoEm), asc(conviteiras.nomeMarca));
}

export async function getConviteiraById(id: string) {
  const [conviteira] = await getDb()
    .select()
    .from(conviteiras)
    .where(eq(conviteiras.id, id))
    .limit(1);

  return conviteira ?? null;
}

export async function getConviteiraByIdForUser(id: string, userId: string) {
  const [conviteira] = await getDb()
    .select()
    .from(conviteiras)
    .where(and(eq(conviteiras.id, id), eq(conviteiras.clerkUserId, userId)))
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

export async function duplicateConviteiraForUser(input: {
  conviteiraId: string;
  clerkUserId: string;
  nomeMarca?: string;
}) {
  const source = await getConviteiraByIdForUser(input.conviteiraId, input.clerkUserId);

  if (!source) {
    throw new Error("CATALOG_NOT_FOUND");
  }

  const db = getDb();
  const [tipoRows, campoRows, filtroRows, arteRows] = await Promise.all([
    getTiposForConviteira(source.id),
    getCamposForConviteira(source.id),
    db
      .select()
      .from(filtrosCatalogo)
      .where(eq(filtrosCatalogo.conviteiraId, source.id))
      .orderBy(asc(filtrosCatalogo.ordem), asc(filtrosCatalogo.nome)),
    db
      .select()
      .from(artes)
      .where(eq(artes.conviteiraId, source.id))
      .orderBy(asc(artes.ordem), asc(artes.nome))
  ]);
  const mediaRows = arteRows.length
    ? await db
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
  const subfiltroRows = filtroRows.length
    ? await db
        .select()
        .from(subfiltrosCatalogo)
        .where(
          inArray(
            subfiltrosCatalogo.filtroId,
            filtroRows.map((filtro) => filtro.id)
          )
        )
        .orderBy(asc(subfiltrosCatalogo.ordem), asc(subfiltrosCatalogo.nome))
    : [];
  const arteSubfiltroRows = arteRows.length
    ? await db
        .select()
        .from(arteSubfiltros)
        .where(
          inArray(
            arteSubfiltros.arteId,
            arteRows.map((arte) => arte.id)
          )
        )
    : [];
  const mediaByArte = mediaRows.reduce((map, media) => {
    const list = map.get(media.arteId) ?? [];
    list.push(media);
    map.set(media.arteId, list);
    return map;
  }, new Map<string, typeof mediaRows>());
  const subfiltrosByFiltro = subfiltroRows.reduce((map, subfiltro) => {
    const list = map.get(subfiltro.filtroId) ?? [];
    list.push(subfiltro);
    map.set(subfiltro.filtroId, list);
    return map;
  }, new Map<string, typeof subfiltroRows>());
  const subfiltrosByArte = arteSubfiltroRows.reduce((map, item) => {
    const list = map.get(item.arteId) ?? [];
    list.push(item.subfiltroId);
    map.set(item.arteId, list);
    return map;
  }, new Map<string, string[]>());
  const nomeMarca = input.nomeMarca?.trim() || `${source.nomeMarca} cópia`;
  const slug = await createUniqueSlug(nomeMarca);

  return db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(conviteiras)
      .values({
        clerkUserId: input.clerkUserId,
        slug,
        nomeMarca,
        bio: source.bio,
        whatsapp: source.whatsapp,
        logoUrl: source.logoUrl,
        bannerUrl: source.bannerUrl,
        bannerMobileUrl: source.bannerMobileUrl,
        corPrincipal: source.corPrincipal,
        corDestaque: source.corDestaque,
        corFundo: source.corFundo,
        corCard: source.corCard,
        corTexto: source.corTexto,
        fonteCatalogo: source.fonteCatalogo,
        planoAtivo: source.planoAtivo
      })
      .returning();

    const tipoIdMap = new Map<string, string>();
    for (const tipo of tipoRows) {
      const [createdTipo] = await tx
        .insert(tiposConvite)
        .values({
          conviteiraId: copy.id,
          nome: tipo.nome,
          nomePublico: tipo.nomePublico,
          descricaoPublica: tipo.descricaoPublica,
          emoji: tipo.emoji,
          modoDisplay: tipo.modoDisplay,
          ordem: tipo.ordem
        })
        .returning();
      tipoIdMap.set(tipo.id, createdTipo.id);
    }

    const subfiltroIdMap = new Map<string, string>();
    for (const filtro of filtroRows) {
      const [createdFiltro] = await tx
        .insert(filtrosCatalogo)
        .values({
          conviteiraId: copy.id,
          nome: filtro.nome,
          ordem: filtro.ordem
        })
        .returning();

      const subfiltros = subfiltrosByFiltro.get(filtro.id) ?? [];
      for (const subfiltro of subfiltros) {
        const [createdSubfiltro] = await tx
          .insert(subfiltrosCatalogo)
          .values({
            filtroId: createdFiltro.id,
            nome: subfiltro.nome,
            ordem: subfiltro.ordem
          })
          .returning();
        subfiltroIdMap.set(subfiltro.id, createdSubfiltro.id);
      }
    }

    if (campoRows.length) {
      await tx.insert(camposPedido).values(
        campoRows.map((campo) => ({
          conviteiraId: copy.id,
          label: campo.label,
          tipo: campo.tipo,
          opcoes: campo.opcoes,
          obrigatorio: campo.obrigatorio,
          ordem: campo.ordem
        }))
      );
    }

    for (const arte of arteRows) {
      const [createdArte] = await tx
        .insert(artes)
        .values({
          conviteiraId: copy.id,
          tipoId: arte.tipoId ? tipoIdMap.get(arte.tipoId) ?? null : null,
          nome: arte.nome,
          tema: arte.tema,
          emoji: arte.emoji,
          canvaUrl: arte.canvaUrl,
          linkPublicado: arte.linkPublicado,
          valor: arte.valor,
          valorAPartir: arte.valorAPartir,
          ordem: arte.ordem,
          ativo: arte.ativo
        })
        .returning();
      const medias = mediaByArte.get(arte.id) ?? [];

      if (medias.length) {
        await tx.insert(arteMidias).values(
          medias.map((media) => ({
            arteId: createdArte.id,
            tipo: media.tipo,
            url: media.url,
            r2Key: media.r2Key,
            ordem: media.ordem
          }))
        );
      }

      const mappedSubfiltros = (subfiltrosByArte.get(arte.id) ?? [])
        .map((subfiltroId) => subfiltroIdMap.get(subfiltroId))
        .filter((subfiltroId): subfiltroId is string => Boolean(subfiltroId));

      if (mappedSubfiltros.length) {
        await tx.insert(arteSubfiltros).values(
          mappedSubfiltros.map((subfiltroId) => ({
            arteId: createdArte.id,
            subfiltroId
          }))
        );
      }
    }

    return copy;
  });
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
    bannerMobileUrl?: string | null;
    corPrincipal?: string;
    corDestaque?: string;
    corFundo?: string;
    corCard?: string;
    corTexto?: string;
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
    bannerMobileUrl: input.bannerMobileUrl,
    corPrincipal: input.corPrincipal,
    corDestaque: input.corDestaque,
    corFundo: input.corFundo,
    corCard: input.corCard,
    corTexto: input.corTexto,
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

export async function getFiltrosForConviteira(
  conviteiraId: string
): Promise<CatalogFiltro[]> {
  const filtroRows = await getDb()
    .select()
    .from(filtrosCatalogo)
    .where(eq(filtrosCatalogo.conviteiraId, conviteiraId))
    .orderBy(asc(filtrosCatalogo.ordem), asc(filtrosCatalogo.nome));

  if (!filtroRows.length) {
    return [];
  }

  const subfiltroRows = await getDb()
    .select()
    .from(subfiltrosCatalogo)
    .where(
      inArray(
        subfiltrosCatalogo.filtroId,
        filtroRows.map((filtro) => filtro.id)
      )
    )
    .orderBy(asc(subfiltrosCatalogo.ordem), asc(subfiltrosCatalogo.nome));

  const subfiltrosByFiltro = subfiltroRows.reduce((map, subfiltro) => {
    const list = map.get(subfiltro.filtroId) ?? [];
    list.push(toCatalogSubfiltro(subfiltro));
    map.set(subfiltro.filtroId, list);
    return map;
  }, new Map<string, CatalogSubfiltro[]>());

  return filtroRows.map((filtro) => ({
    id: filtro.id,
    nome: filtro.nome,
    ordem: filtro.ordem,
    subfiltros: subfiltrosByFiltro.get(filtro.id) ?? []
  }));
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

  const recebimentoRows = pedidoRows.length
    ? await getDb()
        .select()
        .from(pedidoRecebimentos)
        .where(
          inArray(
            pedidoRecebimentos.pedidoId,
            pedidoRows.map((pedido) => pedido.id)
          )
        )
        .orderBy(
          asc(pedidoRecebimentos.dataRecebimento),
          asc(pedidoRecebimentos.criadoEm)
        )
    : [];

  const recebimentosByPedido = groupRecebimentosByPedido(recebimentoRows);
  const pedidosAll = pedidoRows.map((pedido) =>
    toCaixaPedido(pedido, recebimentosByPedido.get(pedido.id) ?? [])
  );
  const activePedidoIds = new Set(
    pedidosAll
      .filter((pedido) => pedido.status !== "cancelado")
      .map((pedido) => pedido.id)
  );

  const pedidosData = pedidosAll
    .filter((pedido) => isInMonth(pedido.dataPedido, normalizedMonth));
  const gastosData = gastoRows
    .map(toCaixaGasto)
    .filter((gasto) => isInMonth(gasto.dataGasto, normalizedMonth));
  const pedidosAtivos = pedidosData.filter((pedido) => pedido.status !== "cancelado");
  const bruto = sumCurrency(pedidosAtivos.map((pedido) => pedido.valorTotal));
  const recebidoPorData = sumCurrency(
    recebimentoRows
      .filter(
        (recebimento) =>
          activePedidoIds.has(recebimento.pedidoId) &&
          isInMonth(recebimento.dataRecebimento, normalizedMonth)
      )
      .map((recebimento) => recebimento.valor)
  );
  const recebidoLegado = sumCurrency(
    pedidosAtivos
      .filter(
        (pedido) => !pedido.recebimentos.length && (pedido.valorPago ?? 0) > 0
      )
      .map((pedido) => pedido.valorPago)
  );
  const recebido = recebidoPorData + recebidoLegado;
  const aReceber = sumCurrency(
    pedidosAtivos.map((pedido) =>
      Math.max((pedido.valorTotal ?? 0) - (pedido.valorPago ?? 0), 0)
    )
  );
  const gastos = sumCurrency(gastosData.map((gasto) => gasto.valor));

  return {
    mes: normalizedMonth,
    resumo: {
      bruto,
      recebido,
      aReceber,
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
      servicosAdicionais: pedido.servicosAdicionais,
      servicosOutros: pedido.servicosOutros,
      servicosValores: pedido.servicosValores,
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
  const [arteRows, tipoRows, filtros] = await Promise.all([
    getDb()
      .select()
      .from(artes)
      .where(eq(artes.conviteiraId, conviteiraId))
      .orderBy(asc(artes.ordem), asc(artes.nome)),
    getTiposForConviteira(conviteiraId),
    getFiltrosForConviteira(conviteiraId)
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
  const subfiltrosByArte = await getSubfiltrosByArteIds(
    arteRows.map((arte) => arte.id),
    filtros
  );

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
    subfiltros: subfiltrosByArte.get(arte.id) ?? [],
    midias: mediaByArte.get(arte.id) ?? []
  }));
}

export async function getPublicCatalog(slug: string): Promise<PublicCatalog | null> {
  const conviteira = await getConviteiraBySlug(slug);

  if (!conviteira) {
    return null;
  }

  const [tipoRows, filtroRows, campoRows, arteRows] = await Promise.all([
    getTiposForConviteira(conviteira.id),
    getFiltrosForConviteira(conviteira.id),
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
  const subfiltrosByArte = await getSubfiltrosByArteIds(
    activeArtes.map((arte) => arte.id),
    filtroRows
  );

  return {
    conviteira: {
      id: conviteira.id,
      slug: conviteira.slug,
      nomeMarca: conviteira.nomeMarca,
      bio: conviteira.bio,
      whatsapp: conviteira.whatsapp,
      logoUrl: conviteira.logoUrl,
      bannerUrl: conviteira.bannerUrl,
      bannerMobileUrl: conviteira.bannerMobileUrl,
      corPrincipal: conviteira.corPrincipal,
      corDestaque: conviteira.corDestaque,
      corFundo: conviteira.corFundo,
      corCard: conviteira.corCard,
      corTexto: conviteira.corTexto,
      fonteCatalogo: conviteira.fonteCatalogo
    },
    tipos: tipoRows.map(toCatalogTipo),
    filtros: filtroRows,
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
      subfiltros: subfiltrosByArte.get(arte.id) ?? [],
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

async function getSubfiltrosByArteIds(
  arteIds: string[],
  filtros: CatalogFiltro[]
) {
  if (!arteIds.length || !filtros.length) {
    return new Map<string, CatalogSubfiltro[]>();
  }

  const subfiltroById = new Map(
    filtros.flatMap((filtro) =>
      filtro.subfiltros.map((subfiltro) => [subfiltro.id, subfiltro] as const)
    )
  );

  const rows = await getDb()
    .select()
    .from(arteSubfiltros)
    .where(inArray(arteSubfiltros.arteId, arteIds));

  return rows.reduce((map, row) => {
    const subfiltro = subfiltroById.get(row.subfiltroId);

    if (!subfiltro) {
      return map;
    }

    const list = map.get(row.arteId) ?? [];
    list.push(subfiltro);
    map.set(row.arteId, list);
    return map;
  }, new Map<string, CatalogSubfiltro[]>());
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

function toCatalogSubfiltro(
  subfiltro: typeof subfiltrosCatalogo.$inferSelect
): CatalogSubfiltro {
  return {
    id: subfiltro.id,
    filtroId: subfiltro.filtroId,
    nome: subfiltro.nome,
    ordem: subfiltro.ordem
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sumCurrency(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function groupRecebimentosByPedido(
  rows: Array<typeof pedidoRecebimentos.$inferSelect>
) {
  return rows.reduce((map, row) => {
    const list = map.get(row.pedidoId) ?? [];
    list.push(toCaixaRecebimento(row));
    map.set(row.pedidoId, list);
    return map;
  }, new Map<string, CaixaRecebimento[]>());
}

function toCaixaRecebimento(
  recebimento: typeof pedidoRecebimentos.$inferSelect
): CaixaRecebimento {
  return {
    id: recebimento.id,
    valor: recebimento.valor,
    dataRecebimento: recebimento.dataRecebimento,
    descricao: recebimento.descricao
  };
}

function toCaixaPedido(
  pedido: typeof pedidos.$inferSelect,
  recebimentos: CaixaRecebimento[] = []
): CaixaPedido {
  const valorPago = recebimentos.length
    ? sumCurrency(recebimentos.map((recebimento) => recebimento.valor))
    : pedido.valorPago;

  return {
    id: pedido.id,
    arteId: pedido.arteId,
    clienteNome: pedido.clienteNome,
    clienteWhatsapp: pedido.clienteWhatsapp,
    tag: pedido.tag,
    arteNome: pedido.arteNome,
    origem: normalizeOrigemPedido(pedido.origem),
    valorTotal: pedido.valorTotal,
    valorPago,
    recebimentos,
    status: pedido.status,
    servicosAdicionais: pedido.servicosAdicionais,
    servicosOutros: pedido.servicosOutros,
    servicosValores: pedido.servicosValores,
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
