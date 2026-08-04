"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { useToast } from "@/components/painel/ToastProvider";
import type {
  CatalogFiltro,
  CatalogSubfiltro,
  CatalogTipo,
  ModoDisplay
} from "@/types/catalog";

const emptyTipo = {
  nome: "",
  nomePublico: "",
  descricaoPublica: "",
  modoDisplay: "demonstracao" as ModoDisplay
};

export function FiltrosClient() {
  const notify = useToast();
  const [tipos, setTipos] = useState<CatalogTipo[]>([]);
  const [filtros, setFiltros] = useState<CatalogFiltro[]>([]);
  const [newTipo, setNewTipo] = useState(emptyTipo);
  const [newFiltroNome, setNewFiltroNome] = useState("");
  const [newSubfiltroNames, setNewSubfiltroNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [tiposResponse, filtrosResponse] = await Promise.all([
      fetch("/api/tipos"),
      fetch("/api/filtros")
    ]);

    if (!tiposResponse.ok || !filtrosResponse.ok) {
      notify("Nao foi possivel carregar os filtros.", "error");
      setLoading(false);
      return;
    }

    const tiposData = (await tiposResponse.json()) as { tipos: CatalogTipo[] };
    const filtrosData = (await filtrosResponse.json()) as { filtros: CatalogFiltro[] };
    setTipos(tiposData.tipos);
    setFiltros(filtrosData.filtros);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function updateLocalTipo(id: string, patch: Partial<CatalogTipo>) {
    setTipos((current) =>
      current.map((tipo) => (tipo.id === id ? { ...tipo, ...patch } : tipo))
    );
  }

  function updateLocalFiltro(id: string, patch: Partial<CatalogFiltro>) {
    setFiltros((current) =>
      current.map((filtro) =>
        filtro.id === id ? { ...filtro, ...patch } : filtro
      )
    );
  }

  function updateLocalSubfiltro(
    filtroId: string,
    subfiltroId: string,
    patch: Partial<CatalogSubfiltro>
  ) {
    setFiltros((current) =>
      current.map((filtro) =>
        filtro.id === filtroId
          ? {
              ...filtro,
              subfiltros: filtro.subfiltros.map((subfiltro) =>
                subfiltro.id === subfiltroId
                  ? { ...subfiltro, ...patch }
                  : subfiltro
              )
            }
          : filtro
      )
    );
  }

  async function saveTipo(tipo: CatalogTipo) {
    setSavingId(tipo.id);
    const response = await fetch(`/api/tipos/${tipo.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nome: tipo.nome,
        nomePublico: tipo.nomePublico,
        descricaoPublica: tipo.descricaoPublica,
        modoDisplay: tipo.modoDisplay,
        ordem: tipo.ordem
      })
    });
    setSavingId(null);

    if (!response.ok) {
      notify("Nao foi possivel salvar o tipo.", "error");
      return;
    }

    notify("Tipo atualizado.");
  }

  async function deleteTipo(id: string) {
    const response = await fetch(`/api/tipos/${id}`, { method: "DELETE" });

    if (!response.ok) {
      notify("Nao foi possivel excluir o tipo.", "error");
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
        nome: newTipo.nome || newTipo.nomePublico,
        nomePublico: newTipo.nomePublico,
        descricaoPublica: newTipo.descricaoPublica,
        modoDisplay: newTipo.modoDisplay,
        ordem: tipos.length
      })
    });

    if (!response.ok) {
      notify("Nao foi possivel criar o tipo.", "error");
      return;
    }

    setNewTipo(emptyTipo);
    notify("Tipo adicionado.");
    await load();
  }

  async function createFiltro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nome = newFiltroNome.trim();

    if (!nome) {
      return;
    }

    const response = await fetch("/api/filtros", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome, ordem: filtros.length })
    });

    if (!response.ok) {
      notify("Nao foi possivel criar o filtro.", "error");
      return;
    }

    setNewFiltroNome("");
    notify("Filtro criado.");
    await load();
  }

  async function saveFiltro(filtro: CatalogFiltro) {
    setSavingId(filtro.id);
    const response = await fetch(`/api/filtros/${filtro.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome: filtro.nome, ordem: filtro.ordem })
    });
    setSavingId(null);

    if (!response.ok) {
      notify("Nao foi possivel salvar o filtro.", "error");
      return;
    }

    notify("Filtro atualizado.");
  }

  async function deleteFiltro(id: string) {
    const confirmed = window.confirm(
      "Excluir esse filtro? Os convites perdem esse subfiltro, mas nao sao excluidos."
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/filtros/${id}`, { method: "DELETE" });

    if (!response.ok) {
      notify("Nao foi possivel excluir o filtro.", "error");
      return;
    }

    setFiltros((current) => current.filter((filtro) => filtro.id !== id));
    notify("Filtro removido.");
  }

  async function createSubfiltro(filtro: CatalogFiltro) {
    const nome = newSubfiltroNames[filtro.id]?.trim();

    if (!nome) {
      return;
    }

    const response = await fetch(`/api/filtros/${filtro.id}/subfiltros`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome, ordem: filtro.subfiltros.length })
    });

    if (!response.ok) {
      notify("Nao foi possivel criar o subfiltro.", "error");
      return;
    }

    setNewSubfiltroNames((current) => ({ ...current, [filtro.id]: "" }));
    notify("Subfiltro criado.");
    await load();
  }

  async function saveSubfiltro(filtroId: string, subfiltro: CatalogSubfiltro) {
    setSavingId(subfiltro.id);
    const response = await fetch(
      `/api/filtros/${filtroId}/subfiltros/${subfiltro.id}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: subfiltro.nome, ordem: subfiltro.ordem })
      }
    );
    setSavingId(null);

    if (!response.ok) {
      notify("Nao foi possivel salvar o subfiltro.", "error");
      return;
    }

    notify("Subfiltro atualizado.");
  }

  async function deleteSubfiltro(filtroId: string, subfiltroId: string) {
    const response = await fetch(
      `/api/filtros/${filtroId}/subfiltros/${subfiltroId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      notify("Nao foi possivel excluir o subfiltro.", "error");
      return;
    }

    setFiltros((current) =>
      current.map((filtro) =>
        filtro.id === filtroId
          ? {
              ...filtro,
              subfiltros: filtro.subfiltros.filter(
                (subfiltro) => subfiltro.id !== subfiltroId
              )
            }
          : filtro
      )
    );
    notify("Subfiltro removido.");
  }

  return (
    <section className="panel-page">
      <header className="page-header">
        <div>
          <p className="page-kicker">Painel</p>
          <h1 className="page-title">Filtros</h1>
          <p className="page-subtitle">
            Organize tipos de convite e filtros personalizados para a vitrine publica.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="empty-state">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        </div>
      ) : (
        <>
          <section className="grid-panel">
            <div>
              <p className="page-kicker">Vitrine</p>
              <h2 className="section-title">Tipos de convite</h2>
              <p className="page-subtitle">
                Esses tipos continuam aparecendo como abas principais no catalogo.
              </p>
            </div>

            <form className="panel-card grid-panel" onSubmit={createTipo}>
              <label className="field">
                <span className="form-label">Nome publico</span>
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
                <span className="form-label">Descricao publica</span>
                <input
                  className="input"
                  onChange={(event) =>
                    setNewTipo({ ...newTipo, descricaoPublica: event.target.value })
                  }
                  value={newTipo.descricaoPublica}
                />
              </label>
              <label className="field">
                <span className="form-label">Modo de exibicao</span>
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
                  <option value="demonstracao">Demonstracao</option>
                </select>
              </label>
              <button className="button" type="submit">
                <Plus size={17} aria-hidden="true" />
                Adicionar tipo
              </button>
            </form>

            <div className="grid-panel">
              {tipos.map((tipo, index) => (
                <article className="panel-card grid-panel" key={tipo.id}>
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                    }}
                  >
                    <label className="field">
                      <span className="form-label">Nome interno</span>
                      <input
                        className="input"
                        onChange={(event) =>
                          updateLocalTipo(tipo.id, { nome: event.target.value })
                        }
                        value={tipo.nome}
                      />
                    </label>
                    <label className="field">
                      <span className="form-label">Nome publico</span>
                      <input
                        className="input"
                        onChange={(event) =>
                          updateLocalTipo(tipo.id, {
                            nomePublico: event.target.value
                          })
                        }
                        value={tipo.nomePublico}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span className="form-label">Descricao publica</span>
                    <textarea
                      className="textarea"
                      onChange={(event) =>
                        updateLocalTipo(tipo.id, {
                          descricaoPublica: event.target.value
                        })
                      }
                      value={tipo.descricaoPublica || ""}
                    />
                  </label>

                  <div className="filter-action-row">
                    <label className="field">
                      <span className="form-label">Modo</span>
                      <select
                        className="select"
                        onChange={(event) =>
                          updateLocalTipo(tipo.id, {
                            modoDisplay: event.target.value as ModoDisplay
                          })
                        }
                        value={tipo.modoDisplay || "lista"}
                      >
                        <option value="lista">Lista</option>
                        <option value="busca">Busca</option>
                        <option value="demonstracao">Demonstracao</option>
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
          </section>

          <section className="grid-panel">
            <div>
              <p className="page-kicker">Filtros personalizados</p>
              <h2 className="section-title">Filtros e subfiltros</h2>
              <p className="page-subtitle">
                Crie filtros como Tema, Evento, Idade ou Genero, e coloque os subfiltros dentro deles.
              </p>
            </div>

            <form className="panel-card grid-panel" onSubmit={createFiltro}>
              <label className="field">
                <span className="form-label">Nome do filtro</span>
                <input
                  className="input"
                  onChange={(event) => setNewFiltroNome(event.target.value)}
                  placeholder="Tema, Evento, Idade..."
                  required
                  value={newFiltroNome}
                />
              </label>
              <button className="button" type="submit">
                <Plus size={17} aria-hidden="true" />
                Criar filtro
              </button>
            </form>

            {filtros.length ? (
              <div className="grid-panel">
                {filtros.map((filtro) => (
                  <article className="panel-card grid-panel" key={filtro.id}>
                    <div className="filter-action-row">
                      <label className="field">
                        <span className="form-label">Filtro principal</span>
                        <input
                          className="input"
                          onChange={(event) =>
                            updateLocalFiltro(filtro.id, {
                              nome: event.target.value
                            })
                          }
                          value={filtro.nome}
                        />
                      </label>
                      <button
                        className="icon-button"
                        onClick={() => saveFiltro(filtro)}
                        title="Salvar filtro"
                        type="button"
                      >
                        {savingId === filtro.id ? (
                          <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                        ) : (
                          <Save size={17} aria-hidden="true" />
                        )}
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => deleteFiltro(filtro.id)}
                        title="Excluir filtro"
                        type="button"
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="subfilter-editor">
                      <div className="subfilter-editor-list">
                        {filtro.subfiltros.map((subfiltro) => (
                          <div className="subfilter-editor-row" key={subfiltro.id}>
                            <input
                              className="input"
                              onChange={(event) =>
                                updateLocalSubfiltro(
                                  filtro.id,
                                  subfiltro.id,
                                  { nome: event.target.value }
                                )
                              }
                              value={subfiltro.nome}
                            />
                            <button
                              className="icon-button"
                              onClick={() => saveSubfiltro(filtro.id, subfiltro)}
                              title="Salvar subfiltro"
                              type="button"
                            >
                              {savingId === subfiltro.id ? (
                                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                              ) : (
                                <Save size={17} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              className="icon-button"
                              onClick={() =>
                                deleteSubfiltro(filtro.id, subfiltro.id)
                              }
                              title="Excluir subfiltro"
                              type="button"
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="subfilter-editor-row">
                        <input
                          className="input"
                          onChange={(event) =>
                            setNewSubfiltroNames((current) => ({
                              ...current,
                              [filtro.id]: event.target.value
                            }))
                          }
                          placeholder="Novo subfiltro"
                          value={newSubfiltroNames[filtro.id] || ""}
                        />
                        <button
                          className="button secondary"
                          onClick={() => void createSubfiltro(filtro)}
                          type="button"
                        >
                          <Plus size={17} aria-hidden="true" />
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                Nenhum filtro personalizado criado ainda.
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
