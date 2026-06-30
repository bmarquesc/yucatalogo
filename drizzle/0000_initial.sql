CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS conviteiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  nome_marca TEXT NOT NULL,
  bio TEXT,
  whatsapp TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  cor_principal TEXT DEFAULT '#0D0D0D',
  cor_destaque TEXT DEFAULT '#C9A96E',
  plano_ativo BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

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
);

CREATE TABLE IF NOT EXISTS artes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
  tipo_id UUID REFERENCES tipos_convite(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tema TEXT,
  emoji TEXT DEFAULT '🎉',
  canva_url TEXT,
  link_publicado TEXT,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arte_midias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arte_id UUID NOT NULL REFERENCES artes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagem','video')),
  url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  ordem INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS campos_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto','data','hora','telefone','textarea','select')),
  opcoes TEXT[],
  obrigatorio BOOLEAN DEFAULT true,
  ordem INT DEFAULT 0
);
