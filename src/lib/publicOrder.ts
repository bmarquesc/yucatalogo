import type { CatalogCampo } from "@/types/catalog";

export type PublicOrderField = Pick<
  CatalogCampo,
  "id" | "label" | "tipo" | "opcoes" | "obrigatorio"
>;

export type PublicOrderValues = Record<string, string>;

export const defaultPublicOrderFields: PublicOrderField[] = [
  {
    id: "nome-aniversariante",
    label: "Nome do responsável pelo convite",
    tipo: "texto",
    opcoes: null,
    obrigatorio: true
  },
  {
    id: "data-evento",
    label: "Data do evento",
    tipo: "data",
    opcoes: null,
    obrigatorio: true
  },
  {
    id: "horario",
    label: "Horário",
    tipo: "hora",
    opcoes: null,
    obrigatorio: true
  },
  {
    id: "local-evento",
    label: "Local do evento",
    tipo: "textarea",
    opcoes: null,
    obrigatorio: false
  },
  {
    id: "whatsapp-mae",
    label: "WhatsApp do responsável pelo convite",
    tipo: "telefone",
    opcoes: null,
    obrigatorio: true
  },
  {
    id: "observacoes",
    label: "Observações",
    tipo: "textarea",
    opcoes: null,
    obrigatorio: false
  }
];

export function buildPublicOrderFields(campos: CatalogCampo[]): PublicOrderField[] {
  const source = campos.length ? campos : defaultPublicOrderFields;

  return source.map((campo) => ({
    id: campo.id,
    label: publicOrderLabel(campo.label),
    tipo: campo.tipo,
    opcoes: campo.opcoes,
    obrigatorio: campo.obrigatorio
  }));
}

export function buildPublicOrderMessage({
  arteNome,
  fields,
  nomeMarca,
  tipoNome,
  values
}: {
  arteNome: string;
  fields: PublicOrderField[];
  nomeMarca: string;
  tipoNome?: string | null;
  values: PublicOrderValues;
}) {
  const tipo = tipoNome ? ` - ${tipoNome}` : "";
  const filledFields = fields.filter((campo) => values[campo.id]?.trim());

  return [
    `*Pedido - ${nomeMarca}*`,
    "",
    `*Arte:* ${arteNome}${tipo}`,
    ...filledFields.map(
      (campo) =>
        `*${campo.label}:* ${formatPublicOrderValue(campo, values[campo.id])}`
    )
  ].join("\n");
}

export function buildPublicOrderObservacoes({
  arteNome,
  fields,
  tipoNome,
  values
}: {
  arteNome: string;
  fields: PublicOrderField[];
  tipoNome?: string | null;
  values: PublicOrderValues;
}) {
  const filledFields = fields.filter((campo) => values[campo.id]?.trim());
  const lines = [
    "Pedido enviado pelo catálogo público.",
    "",
    `Convite escolhido: ${formatPublicArtePedidoNome(arteNome, tipoNome)}`,
    "",
    "Dados informados pela cliente:"
  ];

  for (const campo of filledFields) {
    lines.push(`${campo.label}: ${formatPublicOrderValue(campo, values[campo.id])}`);
  }

  return lines.join("\n");
}

export function findPublicOrderClienteNome(
  fields: PublicOrderField[],
  values: PublicOrderValues
) {
  const preferred = findValueByLabel(fields, values, (label) =>
    label.includes("aniversariante") ||
    (label.includes("responsavel") &&
      !label.includes("whatsapp") &&
      !label.includes("telefone")) ||
    label.includes("cliente") ||
    (label.includes("nome") && !label.includes("mae"))
  );

  if (preferred) {
    return preferred;
  }

  return (
    fields
      .filter((campo) => campo.tipo === "texto")
      .map((campo) => values[campo.id]?.trim())
      .find(Boolean) || ""
  );
}

export function findPublicOrderWhatsapp(
  fields: PublicOrderField[],
  values: PublicOrderValues
) {
  const byLabel = findValueByLabel(
    fields,
    values,
    (label) => label.includes("whatsapp") || label.includes("telefone")
  );

  if (byLabel) {
    return byLabel;
  }

  return (
    fields
      .filter((campo) => campo.tipo === "telefone")
      .map((campo) => values[campo.id]?.trim())
      .find(Boolean) || ""
  );
}

export function findPublicOrderDataEvento(
  fields: PublicOrderField[],
  values: PublicOrderValues
) {
  const byLabel = findValueByLabel(
    fields,
    values,
    (label) =>
      label.includes("data") &&
      (label.includes("evento") ||
        label.includes("festa") ||
        label.includes("entrega") ||
        label.includes("combinada"))
  );

  if (byLabel) {
    return normalizePublicOrderDate(byLabel);
  }

  const firstDate = fields
    .filter((campo) => campo.tipo === "data")
    .map((campo) => values[campo.id]?.trim())
    .find(Boolean);

  return normalizePublicOrderDate(firstDate || "");
}

export function formatPublicOrderValue(campo: PublicOrderField, value: string) {
  if (campo.tipo !== "data") {
    return value;
  }

  const normalizedDate = normalizePublicOrderDate(value);

  if (!normalizedDate) {
    return value;
  }

  return new Date(`${normalizedDate}T12:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function formatPublicArtePedidoNome(
  arteNome: string,
  tipoNome?: string | null
) {
  const nome = arteNome.trim();
  const tipo = tipoNome?.trim() || "";

  if (!tipo || normalizeCatalogSearch(nome).includes(normalizeCatalogSearch(tipo))) {
    return nome;
  }

  return `${nome} ${tipo}`;
}

export function normalizeCatalogSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function publicOrderLabel(label: string) {
  const normalized = normalizeCatalogSearch(label);

  if (normalized.includes("whatsapp") || normalized.includes("telefone")) {
    return "WhatsApp do responsável pelo convite";
  }

  if (normalized.includes("aniversariante")) {
    return "Nome do responsável pelo convite";
  }

  if (normalized.includes("responsavel")) {
    return "Nome do responsável pelo convite";
  }

  if (normalized.includes("data") && normalized.includes("evento")) {
    return "Data do evento";
  }

  if (normalized.includes("horario")) {
    return "Horário";
  }

  if (normalized.includes("local")) {
    return "Local do evento";
  }

  if (normalized.includes("observ")) {
    return "Observações";
  }

  return label;
}

function findValueByLabel(
  fields: PublicOrderField[],
  values: PublicOrderValues,
  matches: (normalizedLabel: string) => boolean
) {
  const field = fields.find((campo) => matches(normalizeCatalogSearch(campo.label)));

  return field ? values[field.id]?.trim() || "" : "";
}

function normalizePublicOrderDate(value: string) {
  const trimmed = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}
