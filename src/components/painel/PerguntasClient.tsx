"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { useToast } from "@/components/painel/ToastProvider";
import type { CatalogCampo, TipoCampoPedido } from "@/types/catalog";

const fieldTypes: Array<{ value: TipoCampoPedido; label: string }> = [
  { value: "texto", label: "Texto" },
  { value: "data", label: "Data" },
  { value: "hora", label: "Hora" },
  { value: "telefone", label: "Telefone" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Seleção" }
];

const emptyCampo = {
  label: "",
  tipo: "texto" as TipoCampoPedido,
  opcoes: "",
  obrigatorio: true
};

export function PerguntasClient() {
  const notify = useToast();
  const [campos, setCampos] = useState<CatalogCampo[]>([]);
  const [newCampo, setNewCampo] = useState(emptyCampo);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/campos");

    if (!response.ok) {
      notify("Não foi possível carregar as perguntas.", "error");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as { campos: CatalogCampo[] };
    setCampos(data.campos);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function updateLocal(id: string, patch: Partial<CatalogCampo>) {
    setCampos((current) =>
      current.map((campo) => (campo.id === id ? { ...campo, ...patch } : campo))
    );
  }

  async function saveCampo(campo: CatalogCampo) {
    setSavingId(campo.id);
    const response = await fetch(`/api/campos/${campo.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(campo)
    });
    setSavingId(null);

    if (!response.ok) {
      notify("Não foi possível salvar o campo.", "error");
      return;
    }

    notify("Campo atualizado.");
  }

  async function deleteCampo(id: string) {
    const response = await fetch(`/api/campos/${id}`, { method: "DELETE" });

    if (!response.ok) {
      notify("Não foi possível excluir o campo.", "error");
      return;
    }

    setCampos((current) => current.filter((campo) => campo.id !== id));
    notify("Campo removido.");
  }

  async function moveCampo(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= campos.length) {
      return;
    }

    const reordered = [...campos];
    const current = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = current;

    const normalized = reordered.map((campo, ordem) => ({ ...campo, ordem }));
    setCampos(normalized);

    await Promise.all(
      normalized.map((campo) =>
        fetch(`/api/campos/${campo.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ordem: campo.ordem })
        })
      )
    );
  }

  async function createCampo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/campos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: newCampo.label,
        tipo: newCampo.tipo,
        opcoes: textToOptions(newCampo.opcoes),
        obrigatorio: newCampo.obrigatorio,
        ordem: campos.length
      })
    });

    if (!response.ok) {
      notify("Não foi possível criar o campo.", "error");
      return;
    }

    setNewCampo(emptyCampo);
    notify("Campo adicionado.");
    await load();
  }

  return (
    <section className="panel-page">
      <header className="page-header">
        <div>
          <p className="page-kicker">Painel</p>
          <h1 className="page-title">Perguntas</h1>
          <p className="page-subtitle">
            Monte o formulário de pedido que será enviado pelo WhatsApp.
          </p>
        </div>
      </header>

      <form className="panel-card grid-panel" onSubmit={createCampo}>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
          }}
        >
          <label className="field">
            <span className="form-label">Pergunta</span>
            <input
              className="input"
              onChange={(event) =>
                setNewCampo({ ...newCampo, label: event.target.value })
              }
              required
              value={newCampo.label}
            />
          </label>
          <label className="field">
            <span className="form-label">Tipo</span>
            <select
              className="select"
              onChange={(event) =>
                setNewCampo({
                  ...newCampo,
                  tipo: event.target.value as TipoCampoPedido
                })
              }
              value={newCampo.tipo}
            >
              {fieldTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {newCampo.tipo === "select" ? (
          <label className="field">
            <span className="form-label">Opções</span>
            <input
              className="input"
              onChange={(event) =>
                setNewCampo({ ...newCampo, opcoes: event.target.value })
              }
              value={newCampo.opcoes}
            />
          </label>
        ) : null}

        <label style={{ alignItems: "center", display: "flex", gap: 8 }}>
          <input
            checked={newCampo.obrigatorio}
            onChange={(event) =>
              setNewCampo({ ...newCampo, obrigatorio: event.target.checked })
            }
            type="checkbox"
          />
          Obrigatório
        </label>

        <button className="button" type="submit">
          <Plus size={17} aria-hidden="true" />
          Adicionar campo
        </button>
      </form>

      {loading ? (
        <div className="empty-state">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        </div>
      ) : (
        <div className="grid-panel">
          {campos.map((campo, index) => (
            <article className="panel-card grid-panel" key={campo.id}>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                }}
              >
                <label className="field">
                  <span className="form-label">Pergunta</span>
                  <input
                    className="input"
                    onChange={(event) =>
                      updateLocal(campo.id, { label: event.target.value })
                    }
                    value={campo.label}
                  />
                </label>
                <label className="field">
                  <span className="form-label">Tipo</span>
                  <select
                    className="select"
                    onChange={(event) =>
                      updateLocal(campo.id, {
                        tipo: event.target.value as TipoCampoPedido,
                        opcoes:
                          event.target.value === "select" ? campo.opcoes ?? [] : null
                      })
                    }
                    value={campo.tipo}
                  >
                    {fieldTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {campo.tipo === "select" ? (
                <label className="field">
                  <span className="form-label">Opções</span>
                  <input
                    className="input"
                    onChange={(event) =>
                      updateLocal(campo.id, {
                        opcoes: textToOptions(event.target.value)
                      })
                    }
                    value={optionsToText(campo.opcoes)}
                  />
                </label>
              ) : null}

              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "space-between"
                }}
              >
                <label style={{ alignItems: "center", display: "flex", gap: 8 }}>
                  <input
                    checked={Boolean(campo.obrigatorio)}
                    onChange={(event) =>
                      updateLocal(campo.id, { obrigatorio: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Obrigatório
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="icon-button"
                    onClick={() => moveCampo(index, -1)}
                    title="Mover para cima"
                    type="button"
                  >
                    <ArrowUp size={17} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => moveCampo(index, 1)}
                    title="Mover para baixo"
                    type="button"
                  >
                    <ArrowDown size={17} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => saveCampo(campo)}
                    title="Salvar"
                    type="button"
                  >
                    {savingId === campo.id ? (
                      <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                    ) : (
                      <Save size={17} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => deleteCampo(campo.id)}
                    title="Excluir"
                    type="button"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function textToOptions(value: string) {
  return value
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
}

function optionsToText(value: string[] | null) {
  return value?.join(", ") ?? "";
}
