"use client";

import { CalendarDays, ExternalLink, Loader2, Search } from "lucide-react";
import { FormEvent, useEffect, useState, type CSSProperties } from "react";

import type { ProducaoData, ProducaoPedido } from "@/types/producao";

type ProductionQueueProps = {
  conviteira: ProducaoData["conviteira"];
  initialTag?: string;
};

export function ProductionQueue({
  conviteira,
  initialTag = ""
}: ProductionQueueProps) {
  const [tag, setTag] = useState(initialTag);
  const [searchedTag, setSearchedTag] = useState(initialTag);
  const [pedidos, setPedidos] = useState<ProducaoPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const shellStyle = {
    "--brand-primary": conviteira.corPrincipal || "#0D0D0D",
    "--brand-accent": conviteira.corDestaque || "#C9A96E"
  } as CSSProperties;

  useEffect(() => {
    if (initialTag.trim()) {
      void search(initialTag);
    }
  }, [initialTag]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await search(tag);
  }

  async function search(value: string) {
    const trimmedTag = value.trim();

    if (trimmedTag.length < 2) {
      setMessage("Informe uma tag com pelo menos 2 caracteres.");
      setPedidos([]);
      setSearchedTag(trimmedTag);
      return;
    }

    setLoading(true);
    setMessage("");
    const response = await fetch(
      `/api/producao/${conviteira.slug}?tag=${encodeURIComponent(trimmedTag)}`,
      { cache: "no-store" }
    );
    setLoading(false);

    if (!response.ok) {
      setMessage("Não foi possível carregar a fila.");
      setPedidos([]);
      return;
    }

    const data = (await response.json()) as { producao: ProducaoData };
    setPedidos(data.producao.pedidos);
    setSearchedTag(data.producao.tag);

    const url = new URL(window.location.href);
    url.searchParams.set("tag", trimmedTag);
    window.history.replaceState(null, "", url);
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
            <span className="production-label">Tag da equipe</span>
            <input
              className="production-input"
              onChange={(event) => setTag(event.target.value)}
              placeholder="Ex.: Ana"
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

        {!message && searchedTag && !loading ? (
          <div className="production-summary">
            <strong>{pedidos.length}</strong>
            <span>{pedidos.length === 1 ? "demanda encontrada" : "demandas encontradas"}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="production-empty">
            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
          </div>
        ) : null}

        {!loading && pedidos.length ? (
          <div className="production-grid">
            {pedidos.map((pedido) => (
              <ProductionCard key={pedido.id} pedido={pedido} />
            ))}
          </div>
        ) : null}

        {!loading && searchedTag && !message && !pedidos.length ? (
          <div className="production-empty">Nenhuma demanda para essa tag.</div>
        ) : null}
      </section>
    </main>
  );
}

function ProductionCard({ pedido }: { pedido: ProducaoPedido }) {
  return (
    <article className="production-card">
      {pedido.midiaUrl ? (
        <img alt="" className="production-thumb" src={pedido.midiaUrl} />
      ) : (
        <div className="production-thumb production-thumb-empty">Pedido</div>
      )}

      <div className="production-card-body">
        <div className="production-card-top">
          <span className="production-tag">{pedido.tag || "Sem tag"}</span>
          <span className="production-date">
            <CalendarDays size={14} aria-hidden="true" />
            {formatDate(pedido.dataEntrega)}
          </span>
        </div>

        <h2>{pedido.clienteNome}</h2>
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
          <p className="production-notes">{pedido.observacoes}</p>
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
