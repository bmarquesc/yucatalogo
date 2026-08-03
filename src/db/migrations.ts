import { sql } from "drizzle-orm";

import { getDb } from "@/db";

export async function migrateDatabase() {
  const db = getDb();

  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conviteiras (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_user_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      nome_marca TEXT NOT NULL,
      bio TEXT,
      whatsapp TEXT NOT NULL,
      logo_url TEXT,
      banner_url TEXT,
      cor_principal TEXT DEFAULT '#0D0D0D',
      cor_destaque TEXT DEFAULT '#C9A96E',
      fonte_catalogo TEXT DEFAULT 'editorial',
      plano_ativo BOOLEAN DEFAULT false,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE conviteiras
    DROP CONSTRAINT IF EXISTS conviteiras_clerk_user_id_key
  `);

  await db.execute(sql`
    ALTER TABLE conviteiras
    DROP CONSTRAINT IF EXISTS conviteiras_clerk_user_id_unique
  `);

  await db.execute(sql`
    ALTER TABLE conviteiras
    ADD COLUMN IF NOT EXISTS fonte_catalogo TEXT DEFAULT 'editorial'
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tipos_convite (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      nome_publico TEXT NOT NULL,
      descricao_publica TEXT,
      emoji TEXT DEFAULT '🎉',
      modo_display TEXT DEFAULT 'lista' CHECK (modo_display IN ('lista','busca','demonstracao')),
      ordem INT DEFAULT 0,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS artes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
      tipo_id UUID REFERENCES tipos_convite(id) ON DELETE SET NULL,
      nome TEXT NOT NULL,
      tema TEXT,
      emoji TEXT DEFAULT '🎉',
      canva_url TEXT,
      link_publicado TEXT,
      valor INT,
      valor_a_partir BOOLEAN DEFAULT false,
      ordem INT DEFAULT 0,
      ativo BOOLEAN DEFAULT true,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE artes
    ADD COLUMN IF NOT EXISTS valor INT
  `);

  await db.execute(sql`
    ALTER TABLE artes
    ADD COLUMN IF NOT EXISTS valor_a_partir BOOLEAN DEFAULT false
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS arte_midias (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      arte_id UUID NOT NULL REFERENCES artes(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('imagem','video')),
      url TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      ordem INT DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS campos_pedido (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('texto','data','hora','telefone','textarea','select')),
      opcoes TEXT[],
      obrigatorio BOOLEAN DEFAULT true,
      ordem INT DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pedidos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
      arte_id UUID REFERENCES artes(id) ON DELETE SET NULL,
      cliente_nome TEXT NOT NULL,
      cliente_whatsapp TEXT,
      tag TEXT,
      arte_nome TEXT,
      valor_total INT DEFAULT 0,
      valor_pago INT DEFAULT 0,
      origem TEXT DEFAULT 'balcao' CHECK (origem IN ('balcao','catalogo')),
      status TEXT DEFAULT 'em_aberto' CHECK (status IN ('em_aberto','sinal_pago','pago','cancelado')),
      status_producao TEXT DEFAULT 'a_fazer' CHECK (status_producao IN ('a_fazer','fazendo','pronto_enviado')),
      servicos_adicionais TEXT[],
      servicos_outros TEXT,
      data_pedido DATE DEFAULT CURRENT_DATE,
      data_entrega DATE,
      observacoes TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS tag TEXT
  `);

  await db.execute(sql`
    ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS status_producao TEXT DEFAULT 'a_fazer'
  `);

  await db.execute(sql`
    ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'balcao'
  `);

  await db.execute(sql`
    ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS servicos_adicionais TEXT[]
  `);

  await db.execute(sql`
    ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS servicos_outros TEXT
  `);

  await db.execute(sql`
    UPDATE pedidos
    SET origem = 'balcao'
    WHERE origem IS NULL
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pedidos_origem_check'
      ) THEN
        ALTER TABLE pedidos
        ADD CONSTRAINT pedidos_origem_check
        CHECK (origem IN ('balcao','catalogo'));
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gastos_caixa (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
      descricao TEXT NOT NULL,
      categoria TEXT,
      valor INT DEFAULT 0,
      data_gasto DATE DEFAULT CURRENT_DATE,
      observacoes TEXT,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
