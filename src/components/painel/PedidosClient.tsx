"use client";

import {
  CalendarDays,
  Copy,
  ExternalLink,
  Loader2,
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
import type { CaixaData, CaixaGasto, CaixaPedido, StatusPedido } from "@/types/caixa";
import type { CatalogArte } from "@/types/catalog";

const statusLabels: Record<StatusPedido, string> = {
  em_aberto: "Em aberto",
  sinal_pago: "Sinal pago",
  pago: "Pago",
  cancelado: "Cancelado"
};

const emptyPedido = {
  clienteNome: "",
  clienteWhatsapp: "",
  tag: "",
  arteId: "",
  arteNome: "",
  valorTotal: "",
  valorPago: "",
  status: "em_aberto" as StatusPedido,
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
  const [caixa, setCaixa] = useState<CaixaData | null>(null);
  const [artes, setArtes] = useState<CatalogArte[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [gastoOpen, setGastoOpen] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
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
      arteNome: arte?.nome || current.arteNome
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

  function openNewPedido() {
    setEditingPedidoId(null);
    setPedidoForm(emptyPedido);
    setArteSearch("");
    setPedidoOpen(true);
  }

  function openEditPedido(pedido: CaixaPedido) {
    setEditingPedidoId(pedido.id);
    setPedidoForm({
      clienteNome: pedido.clienteNome,
      clienteWhatsapp: pedido.clienteWhatsapp ?? "",
      tag: pedido.tag ?? "",
      arteId: pedido.arteId ?? "",
      arteNome: pedido.arteNome ?? "",
      valorTotal: centsToInput(pedido.valorTotal),
      valorPago: centsToInput(pedido.valorPago),
      status: normalizeStatus(pedido.status),
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

  async function submitPedido(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

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
          valorTotal: moneyToCents(pedidoForm.valorTotal),
          valorPago: moneyToCents(pedidoForm.valorPago),
          status: pedidoForm.status,
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

    notify(editingPedidoId ? "Pedido atualizado." : "Pedido cadastrado.");
    closePedidoModal();
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

              {caixa?.pedidos.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {caixa.pedidos.map((pedido) => (
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
                        {pedido.tag ? (
                          <span className="status-pill" style={{ marginTop: 8 }}>
                            {pedido.tag}
                          </span>
                        ) : null}
                      </div>
                      <div className="panel-list-values">
                        <strong>{formatMoney(pedido.valorTotal ?? 0)}</strong>
                        <span>{formatMoney(pedido.valorPago ?? 0)} recebido</span>
                        <div style={{ display: "flex", gap: 6 }}>
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
                  ))}
                </div>
              ) : (
                <div className="empty-state">Nenhum pedido neste mês.</div>
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
                <span className="form-label">Valor total</span>
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
                <span className="form-label">Valor pago</span>
                <input
                  className="input"
                  inputMode="decimal"
                  onChange={(event) =>
                    setPedidoForm({ ...pedidoForm, valorPago: event.target.value })
                  }
                  placeholder="0,00"
                  value={pedidoForm.valorPago}
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

function statusLabel(status: CaixaPedido["status"]) {
  if (status && status in statusLabels) {
    return statusLabels[status as StatusPedido];
  }

  return "Em aberto";
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

function normalizeStatus(status: CaixaPedido["status"]): StatusPedido {
  if (status && status in statusLabels) {
    return status as StatusPedido;
  }

  return "em_aberto";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
