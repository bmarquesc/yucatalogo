export const ORDER_SERVICE_OPTIONS = [
  {
    id: "filtro_personalizado",
    label: "Filtro personalizado"
  },
  {
    id: "lista_presente_personalizada",
    label: "Lista de presente personalizada"
  },
  {
    id: "confirmacao_presenca_personalizada",
    label: "Confirmação de presença personalizada"
  }
] as const;

export type OrderServiceId = (typeof ORDER_SERVICE_OPTIONS)[number]["id"];

const serviceLabels = new Map(
  ORDER_SERVICE_OPTIONS.map((service) => [service.id, service.label])
);

export function sanitizeOrderServices(value: unknown): OrderServiceId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const selected = new Set<OrderServiceId>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    if (serviceLabels.has(item as OrderServiceId)) {
      selected.add(item as OrderServiceId);
    }
  }

  return Array.from(selected);
}

export function formatOrderService(value: string) {
  return serviceLabels.get(value as OrderServiceId) || "";
}

export function formatOrderServices(
  services: Array<string | null | undefined> | null | undefined,
  otherServices?: string | null
) {
  const labels: string[] =
    services
      ?.map((service) => (service ? formatOrderService(service) : ""))
      .filter(Boolean) ?? [];
  const other = otherServices?.trim();

  if (other) {
    labels.push(`Outros serviços: ${other}`);
  }

  return labels;
}
