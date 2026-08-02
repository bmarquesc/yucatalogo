export const CATALOG_FONT_OPTIONS = [
  {
    value: "editorial",
    label: "Poppins + Montserrat",
    description: "Títulos em Poppins e textos em Montserrat.",
    bodyFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
    displayFamily: '"Poppins", ui-sans-serif, system-ui, sans-serif'
  },
  {
    value: "classica",
    label: "Clássica",
    description: "Tradicional e elegante para festas formais.",
    bodyFamily: '"Lora", Georgia, serif',
    displayFamily: '"Playfair Display", Georgia, serif'
  },
  {
    value: "moderna",
    label: "Montserrat",
    description: "Limpa, direta e fácil de ler no celular.",
    bodyFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
    displayFamily: '"Montserrat", ui-sans-serif, system-ui, sans-serif'
  },
  {
    value: "delicada",
    label: "Delicada",
    description: "Leve e acolhedora para catálogos infantis.",
    bodyFamily: '"Quicksand", ui-sans-serif, system-ui, sans-serif',
    displayFamily: '"Quicksand", ui-sans-serif, system-ui, sans-serif'
  },
  {
    value: "clean",
    label: "Poppins",
    description: "Neutra, organizada e com leitura rápida.",
    bodyFamily: '"Poppins", ui-sans-serif, system-ui, sans-serif',
    displayFamily: '"Poppins", ui-sans-serif, system-ui, sans-serif'
  }
] as const;

export type CatalogFontValue = (typeof CATALOG_FONT_OPTIONS)[number]["value"];

export const DEFAULT_CATALOG_FONT: CatalogFontValue = "editorial";

export function getCatalogFontOption(value?: string | null) {
  return (
    CATALOG_FONT_OPTIONS.find((font) => font.value === value) ??
    CATALOG_FONT_OPTIONS.find((font) => font.value === DEFAULT_CATALOG_FONT)!
  );
}
