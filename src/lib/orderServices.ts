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
  },
  {
    id: "mascote",
    label: "Mascote"
  }
] as const;

export type OrderServiceId = (typeof ORDER_SERVICE_OPTIONS)[number]["id"];
export const OTHER_ORDER_SERVICE_ID = "outros";
export type OrderServiceValueMap = Record<string, number>;

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

export function sanitizeOrderServiceValues(
  value: unknown,
  services: Array<string | null | undefined> | null | undefined,
  otherServices?: string | null
): OrderServiceValueMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const validKeys = new Set<string>(sanitizeOrderServices(services));

  if (otherServices?.trim()) {
    validKeys.add(OTHER_ORDER_SERVICE_ID);
  }

  const sanitized: OrderServiceValueMap = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (!validKeys.has(key) || typeof rawValue !== "number") {
      continue;
    }

    if (Number.isFinite(rawValue) && rawValue > 0) {
      sanitized[key] = Math.round(rawValue);
    }
  }

  return Object.keys(sanitized).length ? sanitized : null;
}

export function formatOrderService(value: string) {
  return serviceLabels.get(value as OrderServiceId) || "";
}

export function formatOrderServices(
  services: Array<string | null | undefined> | null | undefined,
  otherServices?: string | null,
  values?: OrderServiceValueMap | null
) {
  const labels: string[] =
    services
      ?.map((service) => {
        if (!service) {
          return "";
        }

        const label = formatOrderService(service);

        return label ? formatServiceWithValue(label, values?.[service]) : "";
      })
      .filter(Boolean) ?? [];
  const other = otherServices?.trim();

  if (other) {
    labels.push(
      formatServiceWithValue(`Outros serviços: ${other}`, values?.[OTHER_ORDER_SERVICE_ID])
    );
  }

  return labels;
}

export function sumOrderServiceValues(values: OrderServiceValueMap | null | undefined) {
  return Object.values(values ?? {}).reduce(
    (total, value) => total + (Number.isFinite(value) ? value : 0),
    0
  );
}

function formatServiceWithValue(label: string, value: number | null | undefined) {
  if (!value || value <= 0) {
    return label;
  }

  return `${label} - ${formatServiceMoney(value)}`;
}

function formatServiceMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(cents / 100);
}
