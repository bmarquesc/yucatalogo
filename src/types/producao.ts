export type StatusProducao = "a_fazer" | "fazendo" | "pronto_enviado";

export type ProducaoPedido = {
  id: string;
  clienteNome: string;
  tag: string | null;
  statusProducao: StatusProducao | string | null;
  arteNome: string | null;
  arteTema: string | null;
  tipoNomePublico: string | null;
  canvaUrl: string | null;
  midiaUrl: string | null;
  servicosAdicionais: string[] | null;
  servicosOutros: string | null;
  servicosValores: Record<string, number> | null;
  dataPedido: string | null;
  dataEntrega: string | null;
  observacoes: string | null;
};

export type ProducaoGrupo = {
  tag: string;
  pedidos: ProducaoPedido[];
};

export type ProducaoData = {
  conviteira: {
    slug: string;
    nomeMarca: string;
    logoUrl: string | null;
    corPrincipal: string | null;
    corDestaque: string | null;
  };
  tag: string;
  grupos: ProducaoGrupo[];
  pedidos: ProducaoPedido[];
};
