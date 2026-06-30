import type { CampoPedidoInput, TipoConviteInput } from "@/types/catalog";

export const DEFAULT_CAMPOS_PEDIDO: CampoPedidoInput[] = [
  {
    label: "Nome do(a) aniversariante",
    tipo: "texto",
    obrigatorio: true,
    ordem: 0
  },
  {
    label: "Data do evento",
    tipo: "data",
    obrigatorio: true,
    ordem: 1
  },
  {
    label: "Horário",
    tipo: "hora",
    obrigatorio: true,
    ordem: 2
  },
  {
    label: "Local do evento",
    tipo: "textarea",
    obrigatorio: false,
    ordem: 3
  },
  {
    label: "Seu WhatsApp",
    tipo: "telefone",
    obrigatorio: true,
    ordem: 4
  },
  {
    label: "Observações",
    tipo: "textarea",
    obrigatorio: false,
    ordem: 5
  }
];

export const DEFAULT_TIPOS_CONVITE: TipoConviteInput[] = [
  {
    nome: "Cinematográfico",
    nomePublico: "Cinematográfico",
    descricaoPublica: "Convites com narrativa visual, movimento e impacto.",
    emoji: "🎬",
    modoDisplay: "demonstracao",
    ordem: 0
  },
  {
    nome: "Infinito",
    nomePublico: "Infinito",
    descricaoPublica: "Uma experiência contínua para apresentar cada detalhe da festa.",
    emoji: "∞",
    modoDisplay: "demonstracao",
    ordem: 1
  },
  {
    nome: "Livro",
    nomePublico: "Livro",
    descricaoPublica: "Formato editorial, delicado e ideal para contar histórias.",
    emoji: "📖",
    modoDisplay: "demonstracao",
    ordem: 2
  },
  {
    nome: "Interativo",
    nomePublico: "Interativo",
    descricaoPublica: "Convites com botões, links e caminhos personalizados.",
    emoji: "✨",
    modoDisplay: "demonstracao",
    ordem: 3
  }
];
