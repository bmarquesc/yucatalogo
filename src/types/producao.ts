export type ProducaoPedido = {
  id: string;
  clienteNome: string;
  tag: string | null;
  arteNome: string | null;
  arteTema: string | null;
  tipoNomePublico: string | null;
  canvaUrl: string | null;
  midiaUrl: string | null;
  dataPedido: string | null;
  dataEntrega: string | null;
  observacoes: string | null;
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
  pedidos: ProducaoPedido[];
};
