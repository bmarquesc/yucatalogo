export type ModoDisplay = "lista" | "busca" | "demonstracao";
export type TipoCampoPedido = "texto" | "data" | "hora" | "telefone" | "textarea" | "select";
export type TipoMidia = "imagem" | "video";

export type CampoPedidoInput = {
  label: string;
  tipo: TipoCampoPedido;
  opcoes?: string[] | null;
  obrigatorio: boolean;
  ordem: number;
};

export type TipoConviteInput = {
  nome: string;
  nomePublico: string;
  descricaoPublica?: string | null;
  emoji?: string | null;
  modoDisplay: ModoDisplay;
  ordem: number;
};

export type CatalogSubfiltro = {
  id: string;
  filtroId: string;
  nome: string;
  ordem: number | null;
};

export type CatalogFiltro = {
  id: string;
  nome: string;
  ordem: number | null;
  subfiltros: CatalogSubfiltro[];
};

export type CatalogMedia = {
  id: string;
  tipo: TipoMidia;
  url: string;
  r2Key: string;
  ordem: number | null;
};

export type CatalogTipo = {
  id: string;
  nome: string;
  nomePublico: string;
  descricaoPublica: string | null;
  emoji: string | null;
  modoDisplay: ModoDisplay | string | null;
  ordem: number | null;
};

export type CatalogArte = {
  id: string;
  tipoId: string | null;
  nome: string;
  tema: string | null;
  emoji: string | null;
  canvaUrl?: string | null;
  linkPublicado: string | null;
  valor: number | null;
  valorAPartir: boolean | null;
  ordem: number | null;
  ativo: boolean | null;
  tipo?: CatalogTipo | null;
  subfiltros: CatalogSubfiltro[];
  midias: CatalogMedia[];
};

export type CatalogCampo = {
  id: string;
  label: string;
  tipo: TipoCampoPedido | string;
  opcoes: string[] | null;
  obrigatorio: boolean | null;
  ordem: number | null;
};

export type PublicCatalog = {
  conviteira: {
    id: string;
    slug: string;
    nomeMarca: string;
    bio: string | null;
    whatsapp: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    bannerMobileUrl: string | null;
    corPrincipal: string | null;
    corDestaque: string | null;
    corFundo: string | null;
    corCard: string | null;
    corTexto: string | null;
    fonteCatalogo: string | null;
  };
  tipos: CatalogTipo[];
  filtros: CatalogFiltro[];
  artes: Omit<CatalogArte, "canvaUrl">[];
  campos: CatalogCampo[];
};
