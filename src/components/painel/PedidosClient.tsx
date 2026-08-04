"use client";

import {
  CalendarDays,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  Wallet
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/painel/Modal";
import { useToast } from "@/components/painel/ToastProvider";
import {
  formatOrderServices,
  OTHER_ORDER_SERVICE_ID,
  ORDER_SERVICE_OPTIONS,
  sanitizeOrderServices,
  sumOrderServiceValues,
  type OrderServiceValueMap,
  type OrderServiceId
} from "@/lib/orderServices";
import type {
  CaixaData,
  CaixaGasto,
  CaixaPedido,
  OrigemPedido,
  StatusPedido
} from "@/types/caixa";
import type { CatalogArte } from "@/types/catalog";

const statusLabels: Record<StatusPedido, string> = {
  em_aberto: "Em aberto",
  sinal_pago: "Sinal pago",
  pago: "Pago",
  cancelado: "Cancelado"
};

const origemLabels: Record<OrigemPedido, string> = {
  balcao: "Balcão",
  catalogo: "Catálogo"
};

type RecebimentoForm = {
  id: string;
  valor: string;
  dataRecebimento: string;
  descricao: string;
};

type RecebimentoPayload = {
  valor: number;
  dataRecebimento: string;
  descricao: string | null;
};

const emptyPedido = {
  clienteNome: "",
  clienteWhatsapp: "",
  tag: "",
  arteId: "",
  arteNome: "",
  origem: "balcao" as OrigemPedido,
  valorTotal: "0,00",
  recebimentos: [] as RecebimentoForm[],
  status: "em_aberto" as StatusPedido,
  servicosAdicionais: [] as OrderServiceId[],
  servicosOutros: "",
  servicosValores: {} as Record<string, string>,
  dataPedido: today(),
  dataEntrega: "",
  observacoes: ""
};

const emptyGasto = {
  descricao: "",
  categoria: "",
  valor: "",
  dataGasto: today(),
  observacoes: ""
};

export function PedidosClient({ productionSlug }: { productionSlug?: string }) {
  const notify = useToast();
  const [mes, setMes] = useState(() => today().slice(0, 7));
  const [origemFiltro, setOrigemFiltro] =
    useState<OrigemPedido | "todos">("todos");
  const [caixa, setCaixa] = useState<CaixaData | null>(null);
  const [artes, setArtes] = useState<CatalogArte[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [gastoOpen, setGastoOpen] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [confirmationPedido, setConfirmationPedido] = useState<CaixaPedido | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [pedidoForm, setPedidoForm] = useState(emptyPedido);
  const [gastoForm, setGastoForm] = useState(emptyGasto);
  const [arteSearch, setArteSearch] = useState("");
  const selectedArte = useMemo(
    () => artes.find((arte) => arte.id === pedidoForm.arteId) ?? null,
    [artes, pedidoForm.arteId]
  );

  const filteredArtes = useMemo(() => {
    const term = normalizeSearch(arteSearch);

    if (!term) {
      return [];
    }

    return artes.filter((arte) =>
      normalizeSearch(
        [arte.nome, arte.tema, arte.tipo?.nomePublico, arte.tipo?.nome]
          .filter(Boolean)
          .join(" ")
      ).includes(term)
    );
  }, [artes, arteSearch]);

  const proximasEntregas = useMemo(() => {
    const pedidos = caixa?.pedidos ?? [];
    return [...pedidos]
      .filter((pedido) => pedido.status !== "cancelado" && pedido.dataEntrega)
      .sort((a, b) => String(a.dataEntrega).localeCompare(String(b.dataEntrega)))
      .slice(0, 4);
  }, [caixa?.pedidos]);

  const pedidosFiltrados = useMemo(() => {
    const pedidos = caixa?.pedidos ?? [];

    if (origemFiltro === "todos") {
      return pedidos;
    }

    return pedidos.filter(
      (pedido) => normalizeOrigem(pedido.origem) === origemFiltro
    );
  }, [caixa?.pedidos, origemFiltro]);
  const effectiveServiceValues = useMemo(
    () =>
      filterServiceValueInputs(
        pedidoForm.servicosValores,
        pedidoForm.servicosAdicionais,
        pedidoForm.servicosOutros
      ),
    [
      pedidoForm.servicosAdicionais,
      pedidoForm.servicosOutros,
      pedidoForm.servicosValores
    ]
  );
  const servicosValorTotal = useMemo(
    () => sumServiceValueInputs(effectiveServiceValues),
    [effectiveServiceValues]
  );
  const pedidoTotalPreview = moneyToCents(pedidoForm.valorTotal) + servicosValorTotal;
  const recebimentosTotalPreview = useMemo(
    () => sumRecebimentoForms(pedidoForm.recebimentos),
    [pedidoForm.recebimentos]
  );
  const pedidoRestantePreview = Math.max(
    pedidoTotalPreview - recebimentosTotalPreview,
    0
  );

  async function load() {
    setLoading(true);
    const [caixaResponse, artesResponse] = await Promise.all([
      fetch(`/api/caixa?mes=${mes}`, { cache: "no-store" }),
      fetch("/api/artes")
    ]);

    if (!caixaResponse.ok || !artesResponse.ok) {
      notify("Não foi possível carregar os pedidos.", "error");
      setLoading(false);
      return;
    }

    const caixaData = (await caixaResponse.json()) as { caixa: CaixaData };
    const artesData = (await artesResponse.json()) as { artes: CatalogArte[] };
    setCaixa(caixaData.caixa);
    setArtes(artesData.artes);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [mes]);

  function selectArte(arteId: string) {
    const arte = artes.find((item) => item.id === arteId);
    setPedidoForm((current) => ({
      ...current,
      arteId,
      arteNome: formatArtePedidoNome(arte, current.arteNome)
    }));

    if (arte) {
      setArteSearch("");
    }
  }

  function clearArte() {
    setPedidoForm((current) => ({
      ...current,
      arteId: "",
      arteNome: ""
    }));
  }

  function togglePedidoServico(serviceId: OrderServiceId, selected: boolean) {
    setPedidoForm((current) => ({
      ...current,
      servicosAdicionais: selected
        ? Array.from(new Set([...current.servicosAdicionais, serviceId]))
        : current.servicosAdicionais.filter((item) => item !== serviceId),
      servicosValores: selected
        ? current.servicosValores
        : removeServiceValue(current.servicosValores, serviceId)
    }));
  }

  function updatePedidoServicoValor(serviceId: string, value: string) {
    setPedidoForm((current) => ({
      ...current,
      servicosValores: {
        ...current.servicosValores,
        [serviceId]: value
      }
    }));
  }

  function addRecebimento() {
    setPedidoForm((current) => ({
      ...current,
      recebimentos: [...current.recebimentos, createRecebimentoForm()]
    }));
  }

  function updateRecebimento(
    id: string,
    field: keyof Omit<RecebimentoForm, "id">,
    value: string
  ) {
    setPedidoForm((current) => ({
      ...current,
      recebimentos: current.recebimentos.map((recebimento) =>
        recebimento.id === id ? { ...recebimento, [field]: value } : recebimento
      )
    }));
  }

  function removeRecebimento(id: string) {
    setPedidoForm((current) => ({
      ...current,
      recebimentos: current.recebimentos.filter(
        (recebimento) => recebimento.id !== id
      )
    }));
  }

  function openNewPedido() {
    setEditingPedidoId(null);
    setPedidoForm(emptyPedido);
    setArteSearch("");
    setPedidoOpen(true);
  }

  function openEditPedido(pedido: CaixaPedido) {
    const servicosValores = serviceValuesToInput(pedido.servicosValores);
    const valorServicos = sumOrderServiceValues(pedido.servicosValores);

    setEditingPedidoId(pedido.id);
    setPedidoForm({
      clienteNome: pedido.clienteNome,
      clienteWhatsapp: pedido.clienteWhatsapp ?? "",
      tag: pedido.tag ?? "",
      arteId: pedido.arteId ?? "",
      arteNome: pedido.arteNome ?? "",
      origem: normalizeOrigem(pedido.origem),
      valorTotal: centsToInput(Math.max((pedido.valorTotal ?? 0) - valorServicos, 0)),
      recebimentos: pedidoToRecebimentoForms(pedido),
      status: normalizeStatus(pedido.status),
      servicosAdicionais: sanitizeOrderServices(pedido.servicosAdicionais),
      servicosOutros: pedido.servicosOutros ?? "",
      servicosValores,
      dataPedido: pedido.dataPedido ?? today(),
      dataEntrega: pedido.dataEntrega ?? "",
      observacoes: pedido.observacoes ?? ""
    });
    setArteSearch("");
    setPedidoOpen(true);
  }

  function closePedidoModal() {
    setPedidoOpen(false);
    setEditingPedidoId(null);
    setPedidoForm(emptyPedido);
    setArteSearch("");
  }

  function openConfirmation(pedido: CaixaPedido) {
    setConfirmationPedido(pedido);
    setConfirmationText(buildPedidoConfirmationText(pedido));
  }

  function closeConfirmation() {
    setConfirmationPedido(null);
    setConfirmationText("");
  }

  async function copyProductionLink() {
    if (!productionSlug) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/producao/${productionSlug}`
      );
      notify("Link da equipe copiado.");
    } catch {
      notify("Não foi possível copiar o link.", "error");
    }
  }

  async function copyConfirmationText() {
    try {
      await navigator.clipboard.writeText(confirmationText);
      notify("Confirmação copiada.");
    } catch {
      notify("Não foi possível copiar a confirmação.", "error");
    }
  }

  function openConfirmationWhatsapp() {
    const whatsapp = normalizeWhatsappNumber(confirmationPedido?.clienteWhatsapp);

    if (!whatsapp) {
      notify("Informe o WhatsApp da cliente no pedido.", "error");
      return;
    }

    window.open(
      `https://wa.me/${whatsapp}?text=${encodeURIComponent(confirmationText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function submitPedido(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const isEditing = Boolean(editingPedidoId);
    const recebimentos = recebimentoFormsToPayload(pedidoForm.recebimentos);
    const valorPago = recebimentos.reduce(
      (total, recebimento) => total + recebimento.valor,
      0
    );

    const response = await fetch(
      editingPedidoId
        ? `/api/caixa/pedidos/${editingPedidoId}`
        : "/api/caixa/pedidos",
      {
        method: editingPedidoId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clienteNome: pedidoForm.clienteNome,
          clienteWhatsapp: pedidoForm.clienteWhatsapp,
          tag: pedidoForm.tag,
          arteId: pedidoForm.arteId || null,
          arteNome: pedidoForm.arteNome,
          origem: pedidoForm.origem,
          valorTotal:
            moneyToCents(pedidoForm.valorTotal) +
            sumServiceValueInputs(effectiveServiceValues),
          valorPago,
          recebimentos,
          status: pedidoForm.status,
          servicosAdicionais: pedidoForm.servicosAdicionais,
          servicosOutros: pedidoForm.servicosOutros,
          servicosValores: serviceValueInputsToCents(effectiveServiceValues),
          dataPedido: pedidoForm.dataPedido,
          dataEntrega: pedidoForm.dataEntrega || null,
          observacoes: pedidoForm.observacoes
        })
      }
    );

    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      notify(data.error || "Não foi possível salvar o pedido.", "error");
      return;
    }

    const data = (await response.json()) as { pedido: CaixaPedido };

    notify(isEditing ? "Pedido atualizado." : "Pedido cadastrado.");
    closePedidoModal();
    if (!isEditing) {
      openConfirmation(data.pedido);
    }
    await load();
  }

  async function submitGasto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/caixa/gastos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        descricao: gastoForm.descricao,
        categoria: gastoForm.categoria,
        valor: moneyToCents(gastoForm.valor),
        dataGasto: gastoForm.dataGasto,
        observacoes: gastoForm.observacoes
      })
    });

    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      notify(data.error || "Não foi possível salvar o gasto.", "error");
      return;
    }

    notify("Gasto cadastrado.");
    setGastoForm(emptyGasto);
    setGastoOpen(false);
    await load();
  }

  async function removePedido(pedido: CaixaPedido) {
    const response = await fetch(`/api/caixa/pedidos/${pedido.id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      notify("Não foi possível excluir o pedido.", "error");
      return;
    }

    notify("Pedido excluído.");
    await load();
  }

  async function removeGasto(gasto: CaixaGasto) {
    const response = await fetch(`/api/caixa/gastos/${gasto.id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      notify("Não foi possível excluir o gasto.", "error");
      return;
    }

    notify("Gasto excluído.");
    await load();
  }

  const resumo = caixa?.resumo;

  return (
    <section className="panel-page">
      <header className="page-header">
        <div>
          <p className="page-kicker">Painel</p>
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">
            Organize clientes, pagamentos, gastos e entregas combinadas por mês.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {productionSlug ? (
            <>
              <a
                className="button secondary"
                href={`/producao/${productionSlug}`}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={17} aria-hidden="true" />
                Fila da equipe
              </a>
              <button
                className="button secondary"
                onClick={copyProductionLink}
                type="button"
              >
                <Copy size={17} aria-hidden="true" />
                Copiar link da equipe
              </button>
            </>
          ) : null}
          <input
            aria-label="Mês do caixa"
            className="input"
            onChange={(event) => setMes(event.target.value)}
            style={{ width: 154 }}
            type="month"
            value={mes}
          />
          <button className="button secondary" onClick={() => setGastoOpen(true)} type="button">
            <ReceiptText size={17} aria-hidden="true" />
            Gasto
          </button>
          <button className="button" onClick={openNewPedido} type="button">
            <Plus size={17} aria-hidden="true" />
            Pedido
          </button>
        </div>
      </header>

      {loading ? (
        <div className="empty-state">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))"
            }}
          >
            <MetricCard label="Bruto vendido" value={formatMoney(resumo?.bruto ?? 0)} />
            <MetricCard label="Recebido" value={formatMoney(resumo?.recebido ?? 0)} />
            <MetricCard label="A receber" value={formatMoney(resumo?.aReceber ?? 0)} />
            <MetricCard label="Gastos" value={formatMoney(resumo?.gastos ?? 0)} />
            <MetricCard
              label="Pedidos balcão"
              value={`${resumo?.pedidosBalcaoCount ?? 0}`}
            />
            <MetricCard
              label="Pedidos catálogo"
              value={`${resumo?.pedidosCatalogoCount ?? 0}`}
            />
            <MetricCard
              label="Líquido no caixa"
              tone={(resumo?.liquido ?? 0) < 0 ? "danger" : "default"}
              value={formatMoney(resumo?.liquido ?? 0)}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
            }}
          >
            <section className="panel-card">
              <div className="page-header" style={{ alignItems: "center", marginBottom: 16 }}>
                <div>
                  <p className="page-kicker">Caixa</p>
                  <h2 className="font-display" style={{ fontSize: 34, lineHeight: 1, margin: 0 }}>
                    Pedidos do mês
                  </h2>
                </div>
                <span className="status-pill">{resumo?.pedidosCount ?? 0} ativos</span>
              </div>

              <div className="origin-filter" aria-label="Filtrar origem dos pedidos">
                <button
                  data-active={origemFiltro === "todos"}
                  onClick={() => setOrigemFiltro("todos")}
                  type="button"
                >
                  Todos
                </button>
                <button
                  data-active={origemFiltro === "balcao"}
                  onClick={() => setOrigemFiltro("balcao")}
                  type="button"
                >
                  Balcão
                </button>
                <button
                  data-active={origemFiltro === "catalogo"}
                  onClick={() => setOrigemFiltro("catalogo")}
                  type="button"
                >
                  Catálogo
                </button>
              </div>

              {pedidosFiltrados.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {pedidosFiltrados.map((pedido) => {
                    const serviceLabels = formatOrderServices(
                      pedido.servicosAdicionais,
                      pedido.servicosOutros,
                      pedido.servicosValores
                    );

                    return (
                      <article className="panel-list-item" key={pedido.id}>
                        <div>
                          <div className="page-kicker">
                            {statusLabel(pedido.status)} · {formatDate(pedido.dataPedido)}
                          </div>
                          <h3 style={{ fontSize: 18, lineHeight: 1.2, margin: "5px 0 0" }}>
                            {pedido.clienteNome}
                          </h3>
                          <p style={{ color: "var(--mid)", margin: "6px 0 0" }}>
                            {pedido.arteNome || "Arte não informada"}
                          </p>
                          {pedido.dataEntrega ? (
                            <p style={{ color: "var(--mid)", margin: "6px 0 0" }}>
                              Entrega combinada: {formatDate(pedido.dataEntrega)}
                            </p>
                          ) : null}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            <span className="status-pill">
                              {origemLabel(pedido.origem)}
                            </span>
                            {pedido.tag ? (
                              <span className="status-pill">{pedido.tag}</span>
                            ) : null}
                            {serviceLabels.map((label) => (
                              <span className="status-pill" key={label}>
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="panel-list-values">
                          <strong>{formatMoney(pedido.valorTotal ?? 0)}</strong>
                          <span>{formatMoney(pedido.valorPago ?? 0)} recebido</span>
                          {pedido.recebimentos?.length ? (
                            <span>
                              {pedido.recebimentos.length} entrada
                              {pedido.recebimentos.length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="icon-button"
                              onClick={() => openConfirmation(pedido)}
                              title="Gerar confirmação para cliente"
                              type="button"
                            >
                              <FileText size={16} aria-hidden="true" />
                            </button>
                            <button
                              className="icon-button"
                              onClick={() => openEditPedido(pedido)}
                              title="Editar pedido"
                              type="button"
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              className="icon-button"
                              onClick={() => removePedido(pedido)}
                              title="Excluir pedido"
                              type="button"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  {caixa?.pedidos.length
                    ? "Nenhum pedido nesse filtro."
                    : "Nenhum pedido neste mês."}
                </div>
              )}
            </section>

            <aside style={{ display: "grid", gap: 18 }}>
              <section className="panel-card">
                <p className="page-kicker">Agenda</p>
                <h2 className="font-display" style={{ fontSize: 30, lineHeight: 1, margin: "6px 0 14px" }}>
                  Próximas entregas
                </h2>
                {proximasEntregas.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {proximasEntregas.map((pedido) => (
                      <div className="mini-row" key={pedido.id}>
                        <CalendarDays size={16} aria-hidden="true" />
                        <div>
                          <strong>{formatDate(pedido.dataEntrega)}</strong>
                          <span>
                            {pedido.clienteNome}
                            {pedido.tag ? ` · ${pedido.tag}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--mid)", margin: 0 }}>
                    Nenhuma entrega combinada neste mês.
                  </p>
                )}
              </section>

              <section className="panel-card">
                <p className="page-kicker">Gastos</p>
                <h2 className="font-display" style={{ fontSize: 30, lineHeight: 1, margin: "6px 0 14px" }}>
                  Saídas do mês
                </h2>
                {caixa?.gastos.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {caixa.gastos.map((gasto) => (
                      <div className="mini-row" key={gasto.id}>
                        <Wallet size={16} aria-hidden="true" />
                        <div>
                          <strong>{gasto.descricao}</strong>
                          <span>
                            {formatMoney(gasto.valor ?? 0)}
                            {gasto.categoria ? ` · ${gasto.categoria}` : ""}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          onClick={() => removeGasto(gasto)}
                          title="Excluir gasto"
                          type="button"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--mid)", margin: 0 }}>
                    Nenhum gasto lançado neste mês.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </>
      )}

      {pedidoOpen ? (
        <Modal
          title={editingPedidoId ? "Editar pedido" : "Novo pedido"}
          onClose={closePedidoModal}
        >
          <form className="grid-panel" onSubmit={submitPedido}>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
              }}
            >
              <label className="field">
                <span className="form-label">Cliente</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setPedidoForm({ ...pedidoForm, clienteNome: event.target.value })
                  }
                  required
                  value={pedidoForm.clienteNome}
                />
              </label>
              <label className="field">
                <span className="form-label">WhatsApp</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setPedidoForm({ ...pedidoForm, clienteWhatsapp: event.target.value })
                  }
                  value={pedidoForm.clienteWhatsapp}
                />
              </label>
            </div>

            <label className="field">
              <span className="form-label">Tag / equipe</span>
              <input
                className="input"
                onChange={(event) =>
                  setPedidoForm({ ...pedidoForm, tag: event.target.value })
                }
                placeholder="Equipe A, Fulana, urgente..."
                value={pedidoForm.tag}
              />
            </label>

            <label className="field">
              <span className="form-label">Buscar convite</span>
              <div style={{ position: "relative" }}>
                <Search
                  aria-hidden="true"
                  size={16}
                  style={{
                    color: "var(--mid)",
                    left: 12,
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)"
                  }}
                />
                <input
                  className="input"
                  onChange={(event) => setArteSearch(event.target.value)}
                  placeholder="Digite tema, nome ou tipo"
                  style={{ paddingLeft: 36 }}
                  value={arteSearch}
                />
              </div>
            </label>

            {arteSearch.trim() ? (
              <div className="arte-search-panel">
                <div className="arte-search-header">
                  <span className="form-label">Resultados</span>
                  <span>
                    {filteredArtes.length} convite
                    {filteredArtes.length === 1 ? "" : "s"}
                  </span>
                </div>
                {filteredArtes.length ? (
                  <div className="arte-search-results">
                    {filteredArtes.map((arte) => (
                      <button
                        className="arte-search-option"
                        key={arte.id}
                        onClick={() => selectArte(arte.id)}
                        type="button"
                      >
                        <strong>{arte.nome}</strong>
                        <span>
                          {arte.tema || "Sem tema"}
                          {arte.tipo?.nomePublico
                            ? ` · ${arte.tipo.nomePublico}`
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="arte-search-empty">
                    Nenhum convite encontrado com essa busca.
                  </div>
                )}
              </div>
            ) : null}

            <div className="arte-linked-card">
              <div>
                <span className="form-label">Arte vinculada</span>
                {selectedArte ? (
                  <>
                    <strong>{selectedArte.nome}</strong>
                    <span>
                      {selectedArte.tema || "Sem tema"}
                      {selectedArte.tipo?.nomePublico
                        ? ` · ${selectedArte.tipo.nomePublico}`
                        : ""}
                    </span>
                  </>
                ) : (
                  <span>Nenhum convite selecionado.</span>
                )}
              </div>
              {selectedArte ? (
                <button
                  className="button secondary"
                  onClick={clearArte}
                  type="button"
                >
                  Remover
                </button>
              ) : null}
            </div>

            <label className="field">
              <span className="form-label">Nome da arte ou serviço</span>
              <input
                className="input"
                onChange={(event) =>
                  setPedidoForm({ ...pedidoForm, arteNome: event.target.value })
                }
                value={pedidoForm.arteNome}
              />
            </label>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"
              }}
            >
              <label className="field">
                <span className="form-label">Valor do convite / arte</span>
                <input
                  className="input"
                  inputMode="decimal"
                  onChange={(event) =>
                    setPedidoForm({ ...pedidoForm, valorTotal: event.target.value })
                  }
                  placeholder="0,00"
                  required
                  value={pedidoForm.valorTotal}
                />
              </label>
              <label className="field">
                <span className="form-label">Status</span>
                <select
                  className="select"
                  onChange={(event) =>
                    setPedidoForm({
                      ...pedidoForm,
                      status: event.target.value as StatusPedido
                    })
                  }
                  value={pedidoForm.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <section className="recebimentos-panel">
              <div className="recebimentos-header">
                <div>
                  <p className="form-label">Recebimentos</p>
                  <p>
                    Lance cada entrada com a data em que ela deve contar no
                    caixa.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={addRecebimento}
                  type="button"
                >
                  <Plus size={17} aria-hidden="true" />
                  Adicionar
                </button>
              </div>

              {pedidoForm.recebimentos.length ? (
                <div className="recebimentos-list">
                  {pedidoForm.recebimentos.map((recebimento, index) => (
                    <div className="recebimento-row" key={recebimento.id}>
                      <label className="field">
                        <span className="form-label">Valor</span>
                        <input
                          className="input"
                          inputMode="decimal"
                          onChange={(event) =>
                            updateRecebimento(
                              recebimento.id,
                              "valor",
                              event.target.value
                            )
                          }
                          placeholder="0,00"
                          value={recebimento.valor}
                        />
                      </label>
                      <label className="field">
                        <span className="form-label">Data da entrada</span>
                        <input
                          className="input"
                          onChange={(event) =>
                            updateRecebimento(
                              recebimento.id,
                              "dataRecebimento",
                              event.target.value
                            )
                          }
                          type="date"
                          value={recebimento.dataRecebimento}
                        />
                      </label>
                      <label className="field">
                        <span className="form-label">Descrição</span>
                        <input
                          className="input"
                          onChange={(event) =>
                            updateRecebimento(
                              recebimento.id,
                              "descricao",
                              event.target.value
                            )
                          }
                          placeholder={index === 0 ? "Sinal" : "Restante"}
                          value={recebimento.descricao}
                        />
                      </label>
                      <button
                        className="icon-button"
                        onClick={() => removeRecebimento(recebimento.id)}
                        title="Remover recebimento"
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="recebimentos-empty">
                  Nenhum pagamento lançado ainda.
                </p>
              )}

              <div className="recebimentos-total">
                <span>Recebido: {formatMoney(recebimentosTotalPreview)}</span>
                <strong>Restante: {formatMoney(pedidoRestantePreview)}</strong>
              </div>
            </section>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"
              }}
            >
              <label className="field">
                <span className="form-label">Data do pedido</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setPedidoForm({ ...pedidoForm, dataPedido: event.target.value })
                  }
                  required
                  type="date"
                  value={pedidoForm.dataPedido}
                />
              </label>
              <label className="field">
                <span className="form-label">Entrega combinada</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setPedidoForm({ ...pedidoForm, dataEntrega: event.target.value })
                  }
                  type="date"
                  value={pedidoForm.dataEntrega}
                />
              </label>
            </div>

            <section className="order-service-panel">
              <div>
                <p className="form-label">Serviços adicionais</p>
                <p style={{ color: "var(--mid)", margin: "6px 0 0" }}>
                  Marque o que acompanha esse pedido.
                </p>
              </div>
              <div className="order-service-options">
                {ORDER_SERVICE_OPTIONS.map((service) => (
                  <label className="order-service-option" key={service.id}>
                    <input
                      checked={pedidoForm.servicosAdicionais.includes(service.id)}
                      onChange={(event) =>
                        togglePedidoServico(service.id, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{service.label}</span>
                    {pedidoForm.servicosAdicionais.includes(service.id) ? (
                      <input
                        className="input order-service-value"
                        inputMode="decimal"
                        onChange={(event) =>
                          updatePedidoServicoValor(service.id, event.target.value)
                        }
                        placeholder="Valor"
                        value={pedidoForm.servicosValores[service.id] ?? ""}
                      />
                    ) : null}
                  </label>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
                }}
              >
                <label className="field">
                  <span className="form-label">Outros serviços</span>
                  <textarea
                    className="textarea"
                    onChange={(event) =>
                      setPedidoForm({
                        ...pedidoForm,
                        servicosOutros: event.target.value
                      })
                    }
                    placeholder="Ex.: arte extra, papelaria, alteração personalizada..."
                    value={pedidoForm.servicosOutros}
                  />
                </label>
                <label className="field">
                  <span className="form-label">Valor</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    onChange={(event) =>
                      updatePedidoServicoValor(
                        OTHER_ORDER_SERVICE_ID,
                        event.target.value
                      )
                    }
                    placeholder="0,00"
                    value={pedidoForm.servicosValores[OTHER_ORDER_SERVICE_ID] ?? ""}
                  />
                </label>
              </div>
              <div className="order-service-total">
                <span>Serviços: {formatMoney(servicosValorTotal)}</span>
                <strong>Total do pedido: {formatMoney(pedidoTotalPreview)}</strong>
              </div>
            </section>

            <label className="field">
              <span className="form-label">Observações</span>
              <textarea
                className="textarea"
                onChange={(event) =>
                  setPedidoForm({ ...pedidoForm, observacoes: event.target.value })
                }
                value={pedidoForm.observacoes}
              />
            </label>

            <button className="button" disabled={saving} type="submit">
              {saving ? (
                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              {editingPedidoId ? "Atualizar pedido" : "Salvar pedido"}
            </button>
          </form>
        </Modal>
      ) : null}

      {gastoOpen ? (
        <Modal title="Novo gasto" onClose={() => setGastoOpen(false)}>
          <form className="grid-panel" onSubmit={submitGasto}>
            <label className="field">
              <span className="form-label">Descrição</span>
              <input
                className="input"
                onChange={(event) =>
                  setGastoForm({ ...gastoForm, descricao: event.target.value })
                }
                required
                value={gastoForm.descricao}
              />
            </label>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"
              }}
            >
              <label className="field">
                <span className="form-label">Categoria</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setGastoForm({ ...gastoForm, categoria: event.target.value })
                  }
                  placeholder="Canva, impressão, tráfego..."
                  value={gastoForm.categoria}
                />
              </label>
              <label className="field">
                <span className="form-label">Valor</span>
                <input
                  className="input"
                  inputMode="decimal"
                  onChange={(event) =>
                    setGastoForm({ ...gastoForm, valor: event.target.value })
                  }
                  placeholder="0,00"
                  required
                  value={gastoForm.valor}
                />
              </label>
              <label className="field">
                <span className="form-label">Data</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setGastoForm({ ...gastoForm, dataGasto: event.target.value })
                  }
                  required
                  type="date"
                  value={gastoForm.dataGasto}
                />
              </label>
            </div>
            <label className="field">
              <span className="form-label">Observações</span>
              <textarea
                className="textarea"
                onChange={(event) =>
                  setGastoForm({ ...gastoForm, observacoes: event.target.value })
                }
                value={gastoForm.observacoes}
              />
            </label>
            <button className="button" disabled={saving} type="submit">
              {saving ? (
                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              Salvar gasto
            </button>
          </form>
        </Modal>
      ) : null}

      {confirmationPedido ? (
        <Modal title="Confirmação para cliente" onClose={closeConfirmation}>
          <div className="grid-panel">
            <label className="field">
              <span className="form-label">Mensagem</span>
              <textarea
                className="textarea"
                onChange={(event) => setConfirmationText(event.target.value)}
                style={{ minHeight: 320 }}
                value={confirmationText}
              />
            </label>

            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
              }}
            >
              <button
                className="button secondary"
                onClick={copyConfirmationText}
                type="button"
              >
                <Copy size={17} aria-hidden="true" />
                Copiar texto
              </button>
              <button
                className="button"
                onClick={openConfirmationWhatsapp}
                type="button"
              >
                <MessageCircle size={17} aria-hidden="true" />
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <article className="panel-card">
      <p className="page-kicker">{label}</p>
      <strong
        className="font-display"
        style={{
          color: tone === "danger" ? "#8b1e1e" : "var(--black)",
          display: "block",
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1,
          marginTop: 8
        }}
      >
        {value}
      </strong>
    </article>
  );
}

function createRecebimentoForm(
  recebimento: Partial<RecebimentoForm> = {}
): RecebimentoForm {
  return {
    id: recebimento.id ?? createLocalId(),
    valor: recebimento.valor ?? "",
    dataRecebimento: recebimento.dataRecebimento ?? today(),
    descricao: recebimento.descricao ?? ""
  };
}

function pedidoToRecebimentoForms(pedido: CaixaPedido): RecebimentoForm[] {
  if (pedido.recebimentos?.length) {
    return pedido.recebimentos.map((recebimento) =>
      createRecebimentoForm({
        id: recebimento.id,
        valor: centsToInput(recebimento.valor),
        dataRecebimento: recebimento.dataRecebimento ?? pedido.dataPedido ?? today(),
        descricao: recebimento.descricao ?? ""
      })
    );
  }

  if ((pedido.valorPago ?? 0) > 0) {
    return [
      createRecebimentoForm({
        valor: centsToInput(pedido.valorPago),
        dataRecebimento: pedido.dataPedido ?? today(),
        descricao: "Recebimento"
      })
    ];
  }

  return [];
}

function recebimentoFormsToPayload(
  recebimentos: RecebimentoForm[]
): RecebimentoPayload[] {
  return recebimentos
    .map((recebimento) => ({
      valor: moneyToCents(recebimento.valor),
      dataRecebimento: recebimento.dataRecebimento || today(),
      descricao: recebimento.descricao.trim() || null
    }))
    .filter((recebimento) => recebimento.valor > 0);
}

function sumRecebimentoForms(recebimentos: RecebimentoForm[]) {
  return recebimentos.reduce(
    (total, recebimento) => total + moneyToCents(recebimento.valor),
    0
  );
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function statusLabel(status: CaixaPedido["status"]) {
  if (status && status in statusLabels) {
    return statusLabels[status as StatusPedido];
  }

  return "Em aberto";
}

function normalizeOrigem(origem: CaixaPedido["origem"]): OrigemPedido {
  return origem === "catalogo" ? "catalogo" : "balcao";
}

function origemLabel(origem: CaixaPedido["origem"]) {
  return origemLabels[normalizeOrigem(origem)];
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(cents / 100);
}

function moneyToCents(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const numberValue = Number.parseFloat(normalized);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }

  return Math.round(numberValue * 100);
}

function centsToInput(value: number | null | undefined) {
  if (!value) {
    return "0,00";
  }

  return (value / 100).toFixed(2).replace(".", ",");
}

function serviceValueInputsToCents(values: Record<string, string>) {
  return Object.entries(values).reduce<OrderServiceValueMap>((result, [key, value]) => {
    const cents = moneyToCents(value);

    if (cents > 0) {
      result[key] = cents;
    }

    return result;
  }, {});
}

function sumServiceValueInputs(values: Record<string, string>) {
  return sumOrderServiceValues(serviceValueInputsToCents(values));
}

function serviceValuesToInput(values: OrderServiceValueMap | null | undefined) {
  return Object.entries(values ?? {}).reduce<Record<string, string>>(
    (result, [key, value]) => {
      result[key] = centsToInput(value);
      return result;
    },
    {}
  );
}

function filterServiceValueInputs(
  values: Record<string, string>,
  services: OrderServiceId[],
  otherServices: string
) {
  const allowed = new Set<string>(services);

  if (otherServices.trim()) {
    allowed.add(OTHER_ORDER_SERVICE_ID);
  }

  return Object.entries(values).reduce<Record<string, string>>(
    (result, [key, value]) => {
      if (allowed.has(key)) {
        result[key] = value;
      }

      return result;
    },
    {}
  );
}

function removeServiceValue(values: Record<string, string>, serviceId: string) {
  const nextValues = { ...values };
  delete nextValues[serviceId];
  return nextValues;
}

function normalizeStatus(status: CaixaPedido["status"]): StatusPedido {
  if (status && status in statusLabels) {
    return status as StatusPedido;
  }

  return "em_aberto";
}

function buildPedidoConfirmationText(pedido: CaixaPedido) {
  const valorTotal = pedido.valorTotal ?? 0;
  const valorPago = pedido.valorPago ?? 0;
  const valorRestante = Math.max(valorTotal - valorPago, 0);
  const observacoes = pedido.observacoes?.trim();
  const serviceLabels = formatOrderServices(
    pedido.servicosAdicionais,
    pedido.servicosOutros,
    pedido.servicosValores
  );
  const lines = [
    `Olá, ${pedido.clienteNome}! Tudo bem?`,
    "",
    "Segue a confirmação do seu pedido para você conferir:",
    "",
    `Cliente: ${pedido.clienteNome}`,
    `Pedido: ${pedido.arteNome || "Arte ou serviço não informado"}`,
    `Data do pedido: ${formatDate(pedido.dataPedido)}`,
    `Data combinada: ${formatDate(pedido.dataEntrega)}`,
    `Valor total: ${formatMoney(valorTotal)}`,
    `Valor pago: ${formatMoney(valorPago)}`,
    `Valor a pagar: ${formatMoney(valorRestante)}`,
    `Status do pagamento: ${statusLabel(pedido.status)}`
  ];

  if (serviceLabels.length) {
    lines.push("", "Serviços adicionais:", ...serviceLabels.map((label) => `- ${label}`));
  }

  const recebimentoLines = (pedido.recebimentos ?? [])
    .filter((recebimento) => (recebimento.valor ?? 0) > 0)
    .map((recebimento) => {
      const descricao = recebimento.descricao?.trim();
      const suffix = descricao ? ` - ${descricao}` : "";
      return `- ${formatDate(recebimento.dataRecebimento)}: ${formatMoney(
        recebimento.valor ?? 0
      )}${suffix}`;
    });

  if (recebimentoLines.length) {
    lines.push("", "Recebimentos:", ...recebimentoLines);
  }

  if (observacoes) {
    lines.push("", "Informações do convite:", observacoes);
  }

  lines.push("", "Se estiver tudo certinho, me responde confirmando por aqui, por favor.");

  return lines.join("\n");
}

function formatArtePedidoNome(arte: CatalogArte | null | undefined, fallback: string) {
  const nome = arte?.nome?.trim();
  const tipo = (arte?.tipo?.nomePublico || arte?.tipo?.nome || "").trim();

  if (!nome) {
    return fallback;
  }

  if (!tipo || normalizeSearch(nome).includes(normalizeSearch(tipo))) {
    return nome;
  }

  return `${nome} ${tipo}`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeWhatsappNumber(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (!digits) {
    return "";
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
