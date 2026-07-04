"use client";

import {
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  Power
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/painel/Modal";
import { UploadZone } from "@/components/painel/UploadZone";
import { useToast } from "@/components/painel/ToastProvider";
import type { CatalogArte, CatalogMedia, CatalogTipo, TipoMidia } from "@/types/catalog";

type UploadResult = {
  url: string;
  key: string;
};

const emptyForm = {
  nome: "",
  tipoId: "",
  tema: "",
  canvaUrl: "",
  linkPublicado: ""
};

export function CatalogoClient() {
  const notify = useToast();
  const [artes, setArtes] = useState<CatalogArte[]>([]);
  const [tipos, setTipos] = useState<CatalogTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const activeCount = useMemo(
    () => artes.filter((arte) => arte.ativo).length,
    [artes]
  );

  async function load() {
    setLoading(true);
    const [artesResponse, tiposResponse] = await Promise.all([
      fetch("/api/artes"),
      fetch("/api/tipos")
    ]);

    if (!artesResponse.ok || !tiposResponse.ok) {
      notify("Não foi possível carregar o catálogo.", "error");
      setLoading(false);
      return;
    }

    const artesData = (await artesResponse.json()) as { artes: CatalogArte[] };
    const tiposData = (await tiposResponse.json()) as { tipos: CatalogTipo[] };
    setArtes(artesData.artes);
    setTipos(tiposData.tipos);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadFile(file: File, tipo: TipoMidia, ordem: number) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pasta", "artes");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("UPLOAD_FAILED");
    }

    const data = (await response.json()) as UploadResult;
    return {
      tipo,
      url: data.url,
      r2Key: data.key,
      ordem
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const imageUploads = await Promise.all(
        imageFiles.map((file, index) => uploadFile(file, "imagem", index))
      );

      const videoUploads = videoFile
        ? [await uploadFile(videoFile, "video", imageUploads.length)]
        : [];

      const response = await fetch("/api/artes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          tipoId: form.tipoId || null,
          tema: form.tema,
          canvaUrl: form.canvaUrl,
          linkPublicado: form.linkPublicado,
          midias: [...imageUploads, ...videoUploads]
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "SAVE_FAILED");
      }

      notify("Arte adicionada ao catálogo.");
      setForm(emptyForm);
      setImageFiles([]);
      setVideoFile(null);
      setModalOpen(false);
      await load();
    } catch {
      notify("Não foi possível salvar a arte.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleArte(arte: CatalogArte) {
    const response = await fetch(`/api/artes/${arte.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ativo: !arte.ativo })
    });

    if (!response.ok) {
      notify("Não foi possível atualizar a arte.", "error");
      return;
    }

    setArtes((current) =>
      current.map((item) =>
        item.id === arte.id ? { ...item, ativo: !item.ativo } : item
      )
    );
    notify(arte.ativo ? "Arte ocultada do showroom." : "Arte ativada no showroom.");
  }

  async function copyCanva(url: string | null | undefined) {
    if (!url) {
      return;
    }

    await navigator.clipboard.writeText(url);
    notify("Link do Canva copiado.");
  }

  return (
    <section className="panel-page">
      <header className="page-header">
        <div>
          <p className="page-kicker">Painel</p>
          <h1 className="page-title">Catálogo</h1>
          <p className="page-subtitle">
            {artes.length} artes cadastradas, {activeCount} visíveis no showroom.
          </p>
        </div>
        <button className="button" onClick={() => setModalOpen(true)} type="button">
          <Plus size={17} aria-hidden="true" />
          Adicionar arte
        </button>
      </header>

      {loading ? (
        <div className="empty-state">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        </div>
      ) : artes.length === 0 ? (
        <div className="empty-state">Nenhuma arte cadastrada ainda.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))"
          }}
        >
          {artes.map((arte) => {
            const cover = arte.midias[0];
            return (
              <article className="panel-card" key={arte.id}>
                <div
                  style={{
                    alignItems: "center",
                    aspectRatio: "9 / 16",
                    background: "#F0E8D8",
                    display: "grid",
                    marginBottom: 14,
                    overflow: "hidden",
                    placeItems: "center"
                  }}
                >
                  {cover ? (
                    <MediaPreview media={cover} label={arte.nome} />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{
                        background: "#E9E5DD",
                        height: "100%",
                        width: "100%"
                      }}
                    />
                  )}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="page-kicker">{arte.tipo?.nomePublico || "Sem tipo"}</div>
                  <h2
                    className="font-display"
                    style={{ fontSize: 28, lineHeight: 1, margin: 0 }}
                  >
                    {arte.nome}
                  </h2>
                  <p style={{ color: "var(--mid)", margin: 0 }}>
                    {arte.tema || "Tema não informado"}
                  </p>
                  <span className="status-pill">
                    {arte.ativo ? "Visível" : "Oculta"}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "1fr 1fr",
                    marginTop: 16
                  }}
                >
                  {arte.canvaUrl ? (
                    <a
                      className="button secondary"
                      href={arte.canvaUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      Canva
                    </a>
                  ) : (
                    <button className="button secondary" disabled type="button">
                      <ExternalLink size={15} aria-hidden="true" />
                      Canva
                    </button>
                  )}
                  <button
                    className="button secondary"
                    onClick={() => copyCanva(arte.canvaUrl)}
                    type="button"
                  >
                    <Copy size={15} aria-hidden="true" />
                    Copiar
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => toggleArte(arte)}
                    style={{ gridColumn: "1 / -1" }}
                    type="button"
                  >
                    <Power size={15} aria-hidden="true" />
                    {arte.ativo ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <Modal title="Adicionar arte" onClose={() => setModalOpen(false)}>
          <form className="grid-panel" onSubmit={handleSubmit}>
            <label className="field">
              <span className="form-label">Nome da arte</span>
              <input
                className="input"
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                required
                value={form.nome}
              />
            </label>

            <label className="field">
              <span className="form-label">Tipo</span>
              <select
                className="select"
                onChange={(event) => setForm({ ...form, tipoId: event.target.value })}
                value={form.tipoId}
              >
                <option value="">Sem tipo</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nomePublico}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="form-label">Tema</span>
              <input
                className="input"
                onChange={(event) => setForm({ ...form, tema: event.target.value })}
                value={form.tema}
              />
            </label>

            <UploadZone
              accept="image/*"
              label="Selecionar imagens"
              multiple
              onFiles={setImageFiles}
            />
            {imageFiles.length ? (
              <p style={{ color: "var(--mid)", margin: 0 }}>
                {imageFiles.length} imagem(ns) selecionada(s). A primeira será a capa.
              </p>
            ) : null}

            <UploadZone
              accept="video/*"
              label="Selecionar vídeo"
              onFiles={(files) => setVideoFile(files[0] ?? null)}
            />
            {videoFile ? (
              <p style={{ color: "var(--mid)", margin: 0 }}>{videoFile.name}</p>
            ) : null}

            <label className="field">
              <span className="form-label">Link do Canva/PEC</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, canvaUrl: event.target.value })
                }
                type="url"
                value={form.canvaUrl}
              />
            </label>

            <label className="field">
              <span className="form-label">Link do convite publicado</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, linkPublicado: event.target.value })
                }
                type="url"
                value={form.linkPublicado}
              />
            </label>

            <button className="button" disabled={submitting} type="submit">
              {submitting ? (
                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <ImagePlus size={17} aria-hidden="true" />
              )}
              Salvar arte
            </button>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function MediaPreview({
  media,
  label
}: {
  media: CatalogMedia;
  label: string;
}) {
  if (media.tipo === "video") {
    return (
      <video
        muted
        playsInline
        src={media.url}
        style={{ height: "100%", objectFit: "cover", width: "100%" }}
      />
    );
  }

  return (
    <img
      alt={label}
      src={media.url}
      style={{ height: "100%", objectFit: "cover", width: "100%" }}
    />
  );
}
