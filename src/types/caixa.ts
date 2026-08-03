export type StatusPedido = "em_aberto" | "sinal_pago" | "pago" | "cancelado";
export type OrigemPedido = "balcao" | "catalogo";

export type CaixaPedido = {
  id: string;
  arteId: string | null;
  clienteNome: string;
  clienteWhatsapp: string | null;
  tag: string | null;
  arteNome: string | null;
  origem: OrigemPedido | string | null;
  valorTotal: number | null;
  valorPago: number | null;
  status: StatusPedido | string | null;
  servicosAdicionais: string[] | null;
  servicosOutros: string | null;
  dataPedido: string | null;
  dataEntrega: string | null;
  observacoes: string | null;
};

export type CaixaGasto = {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: number | null;
  dataGasto: string | null;
  observacoes: string | null;
};

export type CaixaResumo = {
  bruto: number;
  recebido: number;
  aReceber: number;
  gastos: number;
  liquido: number;
  pedidosBalcaoCount: number;
  pedidosCatalogoCount: number;
  pedidosCount: number;
};

export type CaixaData = {
  mes: string;
  resumo: CaixaResumo;
  pedidos: CaixaPedido[];
  gastos: CaixaGasto[];
};
