"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { useToast } from "@/components/painel/ToastProvider";
import type { CatalogTipo, ModoDisplay } from "@/types/catalog";

const emptyTipo = {
  nome: "",
  nomePublico: "",
  descricaoPublica: "",
  emoji: "🎉",
  modoDisplay: "demonstracao" as ModoDisplay
};

export function FiltrosClient() {
  const notify = useToast();
  const [tipos, setTipos] = useState<CatalogTipo[]>([]);
  const [newTipo, setNewTipo] = useState(emptyTipo);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/tipos");

    if (!response.ok) {
      notify("Não foi possível carregar os filtros.", "error");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as { tipos: CatalogTipo[] };
    setTipos(data.tipos);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function updateLocal(id: string, patch: Partial<CatalogTipo>) {
    setTipos((current) =>
      current.map((tipo) => (tipo.id === id ? { ...tipo, ...patch } : tipo))
    );
  }

  async function saveTipo(tipo: CatalogTipo) {
    setSavingId(tipo.id);
    const response = await fetch(`/api/tipos/${tipo.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tipo)
    });
    setSavingId(null);

    if (!response.ok) {
      notify("Não foi possível salvar o tipo.", "error");
      return;
    }

    notify("Tipo atualizado.");
  }

  async function deleteTipo(id: string) {
    const response = await fetch(`/api/tipos/${id}`, { method: "DELETE" });

    if (!response.ok) {
      notify("Não foi possível excluir o tipo.", "error");
      return;
    }

    setTipos((current) => current.filter((tipo) => tipo.id !== id));
    notify("Tipo removido.");
  }

  async function moveTipo(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= tipos.length) {
      return;
    }

    const reordered = [...tipos];
    const current = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = current;

    const normalized = reordered.map((tipo, ordem) => ({ ...tipo, ordem }));
    setTipos(normalized);

    await Promise.all(
      normalized.map((tipo) =>
        fetch(`/api/tipos/${tipo.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ordem: tipo.ordem })
        })
      )
    );
  }

  async function createTipo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/tipos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...newTipo,
        nome: newTipo.nome || newTipo.nomePublico,
        ordem: tipos.length
      })
    });

    if (!response.ok) {
      notify("Não foi possível criar o tipo.", "error");
      return;
    }

    setNewTipo(emptyTipo);
    notify("Tipo adicionado.");
    await load();
  }

  return (
    <section className="panel-page">
      <header className="page-header">
        <div>
          <p className="page-kicker">Painel</p>
          <h1 className="page-title">Filtros</h1>
          <p className="page-subtitle">
            Organize os tipos que aparecem como abas no showroom público.
          </p>
        </div>
      </header>

      <form className="panel-card grid-panel" onSubmit={createTipo}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <label className="field">
            <span className="form-label">Nome público</span>
            <input
              className="input"
              onChange={(event) =>
                setNewTipo({ ...newTipo, nomePublico: event.target.value })
              }
              required
              value={newTipo.nomePublico}
            />
          </label>
          <label className="field">
            <span className="form-label">Emoji</span>
            <input
              className="input"
              onChange={(event) =>
                setNewTipo({ ...newTipo, emoji: event.target.value })
              }
              value={newTipo.emoji}
            />
          </label>
        </div>
        <label className="field">
          <span className="form-label">Descrição pública</span>
          <input
            className="input"
            onChange={(event) =>
              setNewTipo({ ...newTipo, descricaoPublica: event.target.value })
            }
            value={newTipo.descricaoPublica}
          />
        </label>
        <label className="field">
          <span className="form-label">Modo de exibição</span>
          <select
            className="select"
            onChange={(event) =>
              setNewTipo({
                ...newTipo,
                modoDisplay: event.target.value as ModoDisplay
              })
            }
            value={newTipo.modoDisplay}
          >
            <option value="lista">Lista</option>
            <option value="busca">Busca</option>
            <option value="demonstracao">Demonstração</option>
          </select>
        </label>
        <button className="button" type="submit">
          <Plus size={17} aria-hidden="true" />
          Adicionar tipo
        </button>
      </form>

      {loading ? (
        <div className="empty-state">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        </div>
      ) : (
        <div className="grid-panel">
          {tipos.map((tipo, index) => (
            <article className="panel-card grid-panel" key={tipo.id}>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "80px 1fr 1fr"
                }}
              >
                <label className="field">
                  <span className="form-label">Emoji</span>
                  <input
                    className="input"
                    onChange={(event) =>
                      updateLocal(tipo.id, { emoji: event.target.value })
                    }
                    value={tipo.emoji || ""}
                  />
                </label>
                <label className="field">
                  <span className="form-label">Nome interno</span>
                  <input
                    className="input"
                    onChange={(event) =>
                      updateLocal(tipo.id, { nome: event.target.value })
                    }
                    value={tipo.nome}
                  />
                </label>
                <label className="field">
                  <span className="form-label">Nome público</span>
                  <input
                    className="input"
                    onChange={(event) =>
                      updateLocal(tipo.id, { nomePublico: event.target.value })
                    }
                    value={tipo.nomePublico}
                  />
                </label>
              </div>

              <label className="field">
                <span className="form-label">Descrição pública</span>
                <textarea
                  className="textarea"
                  onChange={(event) =>
                    updateLocal(tipo.id, { descricaoPublica: event.target.value })
                  }
                  value={tipo.descricaoPublica || ""}
                />
              </label>

              <div
                style={{
                  alignItems: "end",
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "1fr auto auto auto auto"
                }}
              >
                <label className="field">
                  <span className="form-label">Modo</span>
                  <select
                    className="select"
                    onChange={(event) =>
                      updateLocal(tipo.id, {
                        modoDisplay: event.target.value as ModoDisplay
                      })
                    }
                    value={tipo.modoDisplay || "lista"}
                  >
                    <option value="lista">Lista</option>
                    <option value="busca">Busca</option>
                    <option value="demonstracao">Demonstração</option>
                  </select>
                </label>
                <button
                  className="icon-button"
                  onClick={() => moveTipo(index, -1)}
                  title="Mover para cima"
                  type="button"
                >
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  onClick={() => moveTipo(index, 1)}
                  title="Mover para baixo"
                  type="button"
                >
                  <ArrowDown size={17} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  onClick={() => saveTipo(tipo)}
                  title="Salvar"
                  type="button"
                >
                  {savingId === tipo.id ? (
                    <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                  ) : (
                    <Save size={17} aria-hidden="true" />
                  )}
                </button>
                <button
                  className="icon-button"
                  onClick={() => deleteTipo(tipo.id)}
                  title="Excluir"
                  type="button"
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
