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
  fonte_catalogo TEXT DEFAULT 'editorial',
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

CREATE TABLE IF NOT EXISTS filtros_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subfiltros_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filtro_id UUID NOT NULL REFERENCES filtros_catalogo(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arte_subfiltros (
  arte_id UUID NOT NULL REFERENCES artes(id) ON DELETE CASCADE,
  subfiltro_id UUID NOT NULL REFERENCES subfiltros_catalogo(id) ON DELETE CASCADE,
  PRIMARY KEY (arte_id, subfiltro_id)
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
  status TEXT DEFAULT 'em_aberto' CHECK (status IN ('em_aberto','sinal_pago','pago','cancelado')),
  status_producao TEXT DEFAULT 'a_fazer' CHECK (status_producao IN ('a_fazer','fazendo','pronto_enviado')),
  data_pedido DATE DEFAULT CURRENT_DATE,
  data_entrega DATE,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  valor INT DEFAULT 0,
  data_recebimento DATE DEFAULT CURRENT_DATE,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conviteira_id UUID NOT NULL REFERENCES conviteiras(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor INT DEFAULT 0,
  data_gasto DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
