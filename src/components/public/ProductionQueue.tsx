"use client";

import { CalendarDays, ExternalLink, Loader2, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

import type {
  ProducaoData,
  ProducaoGrupo,
  ProducaoPedido,
  StatusProducao
} from "@/types/producao";

type ProductionQueueProps = {
  conviteira: ProducaoData["conviteira"];
  initialTag?: string;
};

const statusProducaoLabels: Record<StatusProducao, string> = {
  a_fazer: "A fazer",
  fazendo: "Fazendo",
  pronto_enviado: "Pronto/enviado"
};

export function ProductionQueue({
  conviteira,
  initialTag = ""
}: ProductionQueueProps) {
  const [tag, setTag] = useState(initialTag);
  const [searchedTag, setSearchedTag] = useState(initialTag);
  const [grupos, setGrupos] = useState<ProducaoGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const totalPedidos = useMemo(
    () => grupos.reduce((total, grupo) => total + grupo.pedidos.length, 0),
    [grupos]
  );

  const shellStyle = {
    "--brand-primary": conviteira.corPrincipal || "#0D0D0D",
    "--brand-accent": conviteira.corDestaque || "#C9A96E"
  } as CSSProperties;

  useEffect(() => {
    void loadBoard(initialTag);
  }, [initialTag]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadBoard(tag);
  }

  async function loadBoard(value: string) {
    const trimmedTag = value.trim();

    if (trimmedTag && trimmedTag.length < 2) {
      setMessage("Informe uma tag com pelo menos 2 caracteres.");
      setGrupos([]);
      setSearchedTag(trimmedTag);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");
    const query = trimmedTag ? `?tag=${encodeURIComponent(trimmedTag)}` : "";
    const response = await fetch(`/api/producao/${conviteira.slug}${query}`, {
      cache: "no-store"
    });
    setLoading(false);

    if (!response.ok) {
      setMessage("Não foi possível carregar a fila.");
      setGrupos([]);
      return;
    }

    const data = (await response.json()) as { producao: ProducaoData };
    setGrupos(data.producao.grupos);
    setSearchedTag(data.producao.tag);

    const url = new URL(window.location.href);
    if (trimmedTag) {
      url.searchParams.set("tag", trimmedTag);
    } else {
      url.searchParams.delete("tag");
    }
    window.history.replaceState(null, "", url);
  }

  async function updateStatus(pedido: ProducaoPedido, statusProducao: StatusProducao) {
    setSavingStatusId(pedido.id);
    const response = await fetch(
      `/api/producao/${conviteira.slug}/pedidos/${pedido.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statusProducao })
      }
    );
    setSavingStatusId(null);

    if (!response.ok) {
      setMessage("Não foi possível atualizar o status.");
      return;
    }

    setGrupos((current) =>
      current.map((grupo) => ({
        ...grupo,
        pedidos: grupo.pedidos.map((item) =>
          item.id === pedido.id ? { ...item, statusProducao } : item
        )
      }))
    );
  }

  return (
    <main className="production-shell" style={shellStyle}>
      <header className="production-header">
        <div className="production-brand">
          {conviteira.logoUrl ? (
            <img alt="" className="production-logo" src={conviteira.logoUrl} />
          ) : null}
          <div>
            <p className="production-kicker">{conviteira.nomeMarca}</p>
            <h1 className="production-title">Fila de produção</h1>
          </div>
        </div>

        <form className="production-search" onSubmit={submit}>
          <label className="production-field">
            <span className="production-label">Filtrar por tag</span>
            <input
              className="production-input"
              onChange={(event) => setTag(event.target.value)}
              placeholder="Ex.: Mariana"
              value={tag}
            />
          </label>
          <button className="production-button" disabled={loading} type="submit">
            {loading ? (
              <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            ) : (
              <Search size={18} aria-hidden="true" />
            )}
            Buscar
          </button>
        </form>
      </header>

      <section className="production-content">
        {message ? <div className="production-empty">{message}</div> : null}

        {!message && !loading ? (
          <div className="production-summary">
            <strong>{totalPedidos}</strong>
            <span>
              {totalPedidos === 1 ? "demanda" : "demandas"} em {grupos.length}{" "}
              {grupos.length === 1 ? "quadro" : "quadros"}
              {searchedTag ? ` para ${searchedTag}` : ""}
            </span>
          </div>
        ) : null}

        {loading ? (
          <div className="production-empty">
            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
          </div>
        ) : null}

        {!loading && grupos.length ? (
          <div className="production-board">
            {grupos.map((grupo) => (
              <section className="production-column" key={grupo.tag}>
                <header className="production-column-header">
                  <h2>{grupo.tag}</h2>
                  <span>{grupo.pedidos.length}</span>
                </header>
                <div className="production-column-cards">
                  {grupo.pedidos.map((pedido) => (
                    <ProductionCard
                      key={pedido.id}
                      onStatusChange={updateStatus}
                      pedido={pedido}
                      saving={savingStatusId === pedido.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {!loading && !message && !grupos.length ? (
          <div className="production-empty">Nenhuma demanda encontrada.</div>
        ) : null}
      </section>
    </main>
  );
}

function ProductionCard({
  onStatusChange,
  pedido,
  saving
}: {
  onStatusChange: (pedido: ProducaoPedido, status: StatusProducao) => void;
  pedido: ProducaoPedido;
  saving: boolean;
}) {
  const status = normalizeStatusProducao(pedido.statusProducao);

  return (
    <article className="production-card">
      {pedido.midiaUrl ? (
        <img alt="" className="production-thumb" src={pedido.midiaUrl} />
      ) : (
        <div className="production-thumb production-thumb-empty">Pedido</div>
      )}

      <div className="production-card-body">
        <div className="production-card-top">
          <label className="production-status-field">
            <span>Status</span>
            <select
              className="production-status-select"
              disabled={saving}
              onChange={(event) =>
                onStatusChange(pedido, event.target.value as StatusProducao)
              }
              value={status}
            >
              {Object.entries(statusProducaoLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <span className="production-date">
            <CalendarDays size={14} aria-hidden="true" />
            {formatDate(pedido.dataEntrega)}
          </span>
        </div>

        <h3>{pedido.clienteNome}</h3>
        <p className="production-art-name">
          {pedido.arteNome || "Convite não informado"}
        </p>

        <dl className="production-details">
          {pedido.tipoNomePublico ? (
            <>
              <dt>Tipo</dt>
              <dd>{pedido.tipoNomePublico}</dd>
            </>
          ) : null}

          {pedido.arteTema ? (
            <>
              <dt>Tema</dt>
              <dd>{pedido.arteTema}</dd>
            </>
          ) : null}

          <dt>Pedido</dt>
          <dd>{formatDate(pedido.dataPedido)}</dd>
        </dl>

        {pedido.observacoes ? (
          <div className="production-notes">
            <span>Observações</span>
            <p>{pedido.observacoes}</p>
          </div>
        ) : null}

        {pedido.canvaUrl ? (
          <a
            className="production-link"
            href={pedido.canvaUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Abrir no Canva
          </a>
        ) : null}
      </div>
    </article>
  );
}

function normalizeStatusProducao(status: ProducaoPedido["statusProducao"]): StatusProducao {
  if (
    status === "a_fazer" ||
    status === "fazendo" ||
    status === "pronto_enviado"
  ) {
    return status;
  }

  return "a_fazer";
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
