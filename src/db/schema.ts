import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const conviteiras = pgTable("conviteiras", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  slug: text("slug").notNull().unique(),
  nomeMarca: text("nome_marca").notNull(),
  bio: text("bio"),
  whatsapp: text("whatsapp").notNull(),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  corPrincipal: text("cor_principal").default("#0D0D0D"),
  corDestaque: text("cor_destaque").default("#C9A96E"),
  planoAtivo: boolean("plano_ativo").default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow()
});

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

export type Conviteira = typeof conviteiras.$inferSelect;
export type TipoConvite = typeof tiposConvite.$inferSelect;
export type Arte = typeof artes.$inferSelect;
export type ArteMidia = typeof arteMidias.$inferSelect;
export type CampoPedido = typeof camposPedido.$inferSelect;
