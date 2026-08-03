import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const conviteiras = pgTable("conviteiras", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: text("clerk_user_id").notNull(),
  slug: text("slug").notNull().unique(),
  nomeMarca: text("nome_marca").notNull(),
  bio: text("bio"),
  whatsapp: text("whatsapp").notNull(),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  corPrincipal: text("cor_principal").default("#0D0D0D"),
  corDestaque: text("cor_destaque").default("#C9A96E"),
  fonteCatalogo: text("fonte_catalogo").default("editorial"),
  planoAtivo: boolean("plano_ativo").default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow()
});

export const acessosKiwify = pgTable(
  "acessos_kiwify",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    nome: text("nome"),
    telefone: text("telefone"),
    produtoId: text("produto_id"),
    produtoNome: text("produto_nome"),
    pedidoId: text("pedido_id"),
    assinaturaId: text("assinatura_id"),
    status: text("status").default("pendente"),
    acessoAtivo: boolean("acesso_ativo").default(false),
    validoAte: timestamp("valido_ate", { withTimezone: true }),
    ultimoEvento: text("ultimo_evento"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    emailUnique: uniqueIndex("acessos_kiwify_email_unique").on(table.email)
  })
);

export const tiposConvite = pgTable(
  "tipos_convite",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conviteiraId: uuid("conviteira_id")
      .notNull()
      .references(() => conviteiras.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    nomePublico: text("nome_publico").notNull(),
    descricaoPublica: text("descricao_publica"),
    emoji: text("emoji").default("🎉"),
    modoDisplay: text("modo_display").default("lista"),
    ordem: integer("ordem").default(0),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    modoDisplayCheck: check(
      "tipos_convite_modo_display_check",
      sql`${table.modoDisplay} IN ('lista','busca','demonstracao')`
    )
  })
);

export const artes = pgTable("artes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conviteiraId: uuid("conviteira_id")
    .notNull()
    .references(() => conviteiras.id, { onDelete: "cascade" }),
  tipoId: uuid("tipo_id").references(() => tiposConvite.id, {
    onDelete: "set null"
  }),
  nome: text("nome").notNull(),
  tema: text("tema"),
  emoji: text("emoji").default("🎉"),
  canvaUrl: text("canva_url"),
  linkPublicado: text("link_publicado"),
  valor: integer("valor"),
  valorAPartir: boolean("valor_a_partir").default(false),
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow()
});

export const arteMidias = pgTable(
  "arte_midias",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    arteId: uuid("arte_id")
      .notNull()
      .references(() => artes.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    url: text("url").notNull(),
    r2Key: text("r2_key").notNull(),
    ordem: integer("ordem").default(0)
  },
  (table) => ({
    tipoCheck: check("arte_midias_tipo_check", sql`${table.tipo} IN ('imagem','video')`)
  })
);

export const camposPedido = pgTable(
  "campos_pedido",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conviteiraId: uuid("conviteira_id")
      .notNull()
      .references(() => conviteiras.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    tipo: text("tipo").notNull(),
    opcoes: text("opcoes").array(),
    obrigatorio: boolean("obrigatorio").default(true),
    ordem: integer("ordem").default(0)
  },
  (table) => ({
    tipoCheck: check(
      "campos_pedido_tipo_check",
      sql`${table.tipo} IN ('texto','data','hora','telefone','textarea','select')`
    )
  })
);

export const pedidos = pgTable(
  "pedidos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    conviteiraId: uuid("conviteira_id")
      .notNull()
      .references(() => conviteiras.id, { onDelete: "cascade" }),
    arteId: uuid("arte_id").references(() => artes.id, { onDelete: "set null" }),
    clienteNome: text("cliente_nome").notNull(),
    clienteWhatsapp: text("cliente_whatsapp"),
    tag: text("tag"),
    arteNome: text("arte_nome"),
    valorTotal: integer("valor_total").default(0),
    valorPago: integer("valor_pago").default(0),
    origem: text("origem").default("balcao"),
    status: text("status").default("em_aberto"),
    statusProducao: text("status_producao").default("a_fazer"),
    servicosAdicionais: text("servicos_adicionais").array(),
    servicosOutros: text("servicos_outros"),
    servicosValores: jsonb("servicos_valores").$type<Record<string, number>>(),
    dataPedido: date("data_pedido").default(sql`CURRENT_DATE`),
    dataEntrega: date("data_entrega"),
    observacoes: text("observacoes"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    statusCheck: check(
      "pedidos_status_check",
      sql`${table.status} IN ('em_aberto','sinal_pago','pago','cancelado')`
    ),
    statusProducaoCheck: check(
      "pedidos_status_producao_check",
      sql`${table.statusProducao} IN ('a_fazer','fazendo','pronto_enviado')`
    ),
    origemCheck: check(
      "pedidos_origem_check",
      sql`${table.origem} IN ('balcao','catalogo')`
    )
  })
);

export const gastosCaixa = pgTable("gastos_caixa", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conviteiraId: uuid("conviteira_id")
    .notNull()
    .references(() => conviteiras.id, { onDelete: "cascade" }),
  descricao: text("descricao").notNull(),
  categoria: text("categoria"),
  valor: integer("valor").default(0),
  dataGasto: date("data_gasto").default(sql`CURRENT_DATE`),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow()
});

export type Conviteira = typeof conviteiras.$inferSelect;
export type AcessoKiwify = typeof acessosKiwify.$inferSelect;
export type TipoConvite = typeof tiposConvite.$inferSelect;
export type Arte = typeof artes.$inferSelect;
export type ArteMidia = typeof arteMidias.$inferSelect;
export type CampoPedido = typeof camposPedido.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type GastoCaixa = typeof gastosCaixa.$inferSelect;
