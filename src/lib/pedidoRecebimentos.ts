import type { StatusPedido } from "@/types/caixa";

const STATUS_OPTIONS: StatusPedido[] = [
  "em_aberto",
  "sinal_pago",
  "pago",
  "cancelado"
];

export type PedidoRecebimentoPayload = {
  valor?: number;
  dataRecebimento?: string | null;
  descricao?: string | null;
};

export type SanitizedPedidoRecebimento = {
  valor: number;
  dataRecebimento: string;
  descricao: string | null;
};

export function sanitizeMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}

export function sanitizePedidoRecebimentos(
  recebimentos: unknown,
  fallbackValorPago: number,
  fallbackDate: string | null
) {
  if (Array.isArray(recebimentos)) {
    return recebimentos
      .map((recebimento) =>
        sanitizePedidoRecebimento(recebimento, fallbackDate)
      )
      .filter(
        (
          recebimento
        ): recebimento is SanitizedPedidoRecebimento => recebimento !== null
      );
  }

  if (fallbackValorPago > 0) {
    return [
      {
        valor: fallbackValorPago,
        dataRecebimento: fallbackDate || today(),
        descricao: "Recebimento"
      }
    ];
  }

  return [];
}

export function sumPedidoRecebimentos(
  recebimentos: SanitizedPedidoRecebimento[]
) {
  return recebimentos.reduce((total, recebimento) => total + recebimento.valor, 0);
}

export function resolvePedidoStatus(
  status: StatusPedido | undefined,
  valorTotal: number,
  valorPago: number
): StatusPedido {
  if (status && STATUS_OPTIONS.includes(status)) {
    return status;
  }

  if (valorTotal > 0 && valorPago >= valorTotal) {
    return "pago";
  }

  if (valorPago > 0) {
    return "sinal_pago";
  }

  return "em_aberto";
}

export function normalizeDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizePedidoRecebimento(
  value: unknown,
  fallbackDate: string | null
) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const recebimento = value as PedidoRecebimentoPayload;
  const valor = sanitizeMoney(recebimento.valor);

  if (valor <= 0) {
    return null;
  }

  return {
    valor,
    dataRecebimento:
      normalizeDate(recebimento.dataRecebimento) || fallbackDate || today(),
    descricao: recebimento.descricao?.trim() || null
  };
}
