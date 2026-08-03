"use client";

import {
  Copy,
  Edit3,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Video
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Modal } from "@/components/painel/Modal";
import { UploadZone } from "@/components/painel/UploadZone";
import { useToast } from "@/components/painel/ToastProvider";
import type { CatalogArte, CatalogMedia, CatalogTipo, TipoMidia } from "@/types/catalog";

type UploadResult = {
  url: string;
  key: string;
};

type ArteForm = {
  nome: string;
  tipoId: string;
  tema: string;
  canvaUrl: string;
  linkPublicado: string;
};

const MAX_IMAGES = 10;

const emptyForm: ArteForm = {
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
  const [editingArte, setEditingArte] = useState<CatalogArte | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ArteForm>(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const existingImages =
    editingArte?.midias.filter((media) => media.tipo === "imagem") ?? [];
  const existingVideos =
    editingArte?.midias.filter((media) => media.tipo === "video") ?? [];
  const imageCount = existingImages.length + imageFiles.length;

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

  function openCreateModal() {
    setEditingArte(null);
    setForm(emptyForm);
    setImageFiles([]);
    setVideoFile(null);
    setModalOpen(true);
  }

  function openEditModal(arte: CatalogArte) {
    setEditingArte(arte);
    setForm({
      nome: arte.nome,
      tipoId: arte.tipoId || "",
      tema: arte.tema || "",
      canvaUrl: arte.canvaUrl || "",
      linkPublicado: arte.linkPublicado || ""
    });
    setImageFiles([]);
    setVideoFile(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingArte(null);
    setForm(emptyForm);
    setImageFiles([]);
    setVideoFile(null);
  }

  function addImageFiles(files: File[]) {
    const remaining = MAX_IMAGES - imageCount;

    if (remaining <= 0) {
      notify("Este convite já tem o limite de 10 fotos.", "error");
      return;
    }

    const selected = files.slice(0, remaining);
    setImageFiles((current) => [...current, ...selected]);

    if (files.length > remaining) {
      notify(`Foram adicionadas ${remaining} fotos. O limite é 10 por convite.`, "error");
    }
  }

  function removeSelectedImage(index: number) {
    setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

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

  async function createMedia(arteId: string, media: Awaited<ReturnType<typeof uploadFile>>) {
    const response = await fetch("/api/midias", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        arteId,
        tipo: media.tipo,
        url: media.url,
        r2Key: media.r2Key,
        ordem: media.ordem
      })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || "MEDIA_SAVE_FAILED");
    }
  }

  async function deleteMedia(media: CatalogMedia) {
    const response = await fetch(`/api/midias/${media.id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || "MEDIA_DELETE_FAILED");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (imageCount > MAX_IMAGES) {
      notify("Cada convite pode ter no máximo 10 fotos.", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (editingArte) {
        await updateArte(editingArte);
      } else {
        await createArte();
      }

      notify(editingArte ? "Convite atualizado." : "Convite adicionado ao catálogo.");
      closeModal();
      await load();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o convite.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createArte() {
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
      throw new Error(data.error || "Não foi possível salvar o convite.");
    }
  }

  async function updateArte(arte: CatalogArte) {
    const response = await fetch(`/api/artes/${arte.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nome: form.nome,
        tipoId: form.tipoId || null,
        tema: form.tema,
        canvaUrl: form.canvaUrl,
        linkPublicado: form.linkPublicado
      })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || "Não foi possível atualizar o convite.");
    }

    const imageUploads = await Promise.all(
      imageFiles.map((file, index) =>
        uploadFile(file, "imagem", existingImages.length + index)
      )
    );

    for (const media of imageUploads) {
      await createMedia(arte.id, media);
    }

    if (videoFile) {
      for (const media of existingVideos) {
        await deleteMedia(media);
      }

      const uploadedVideo = await uploadFile(
        videoFile,
        "video",
        existingImages.length + imageUploads.length
      );
      await createMedia(arte.id, uploadedVideo);
    }
  }

  async function removeExistingMedia(media: CatalogMedia) {
    try {
      await deleteMedia(media);
      setEditingArte((current) =>
        current
          ? {
              ...current,
              midias: current.midias.filter((item) => item.id !== media.id)
            }
          : current
      );
      setArtes((current) =>
        current.map((arte) => ({
          ...arte,
          midias: arte.midias.filter((item) => item.id !== media.id)
        }))
      );
      notify("Mídia removida.");
    } catch {
      notify("Não foi possível remover a mídia.", "error");
    }
  }

  async function deleteArte(arte: CatalogArte) {
    const confirmed = window.confirm(
      `Excluir o convite "${arte.nome}" do catálogo? Esta ação não pode ser desfeita.`
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/artes/${arte.id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      notify("Não foi possível excluir o convite.", "error");
      return;
    }

    notify("Convite excluído.");
    await load();
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
            {artes.length} convites cadastrados. Cada convite pode ter até 10 fotos e 1 vídeo.
          </p>
        </div>
        <button className="button" onClick={openCreateModal} type="button">
          <Plus size={17} aria-hidden="true" />
          Adicionar convite
        </button>
      </header>

      {loading ? (
        <div className="empty-state">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        </div>
      ) : artes.length === 0 ? (
        <div className="empty-state">Nenhum convite cadastrado ainda.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))"
          }}
        >
          {artes.map((arte) => {
            const cover =
              arte.midias.find((media) => media.tipo === "imagem") ?? arte.midias[0];
            const imageTotal = arte.midias.filter((media) => media.tipo === "imagem").length;
            const hasVideo = arte.midias.some((media) => media.tipo === "video");

            return (
              <article className="panel-card" key={arte.id}>
                <div
                  style={{
                    alignItems: "center",
                    aspectRatio: "9 / 16",
                    background: "#F0E8D8",
                    borderRadius: 4,
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span className="status-pill">{imageTotal}/10 fotos</span>
                    <span className="status-pill">
                      {hasVideo ? "1 vídeo" : "sem vídeo"}
                    </span>
                    {!arte.ativo ? <span className="status-pill">Oculto</span> : null}
                  </div>
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
                  {arte.linkPublicado ? (
                    <a
                      className="button secondary"
                      href={arte.linkPublicado}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      Abrir
                    </a>
                  ) : (
                    <button className="button secondary" disabled type="button">
                      <ExternalLink size={15} aria-hidden="true" />
                      Abrir
                    </button>
                  )}
                  <button
                    className="button secondary"
                    onClick={() => copyCanva(arte.canvaUrl)}
                    style={{ gridColumn: "1 / -1" }}
                    type="button"
                  >
                    <Copy size={15} aria-hidden="true" />
                    Copiar link do Canva
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => openEditModal(arte)}
                    style={{ gridColumn: "1 / -1" }}
                    type="button"
                  >
                    <Edit3 size={15} aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    className="button danger"
                    onClick={() => deleteArte(arte)}
                    style={{ gridColumn: "1 / -1" }}
                    type="button"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Excluir convite
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <Modal
          title={editingArte ? "Editar convite" : "Adicionar convite"}
          onClose={closeModal}
        >
          <form className="grid-panel" onSubmit={handleSubmit}>
            <label className="field">
              <span className="form-label">Nome do convite</span>
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

            <section className="grid-panel">
              <div>
                <p className="form-label">Fotos do convite</p>
                <p style={{ color: "var(--mid)", margin: "6px 0 0" }}>
                  {imageCount}/{MAX_IMAGES} fotos selecionadas.
                </p>
              </div>
              {existingImages.length > 0 ? (
                <MediaList
                  medias={existingImages}
                  onRemove={removeExistingMedia}
                  title="Fotos atuais"
                />
              ) : null}
              <UploadZone
                accept="image/*"
                label="Adicionar fotos"
                multiple
                onFiles={addImageFiles}
              />
              {imageFiles.length ? (
                <SelectedFiles
                  files={imageFiles}
                  onRemove={removeSelectedImage}
                  title="Novas fotos"
                />
              ) : null}
            </section>

            <section className="grid-panel">
              <div>
                <p className="form-label">Vídeo do convite</p>
                <p style={{ color: "var(--mid)", margin: "6px 0 0" }}>
                  Mantenha no máximo 1 vídeo por convite.
                </p>
              </div>
              {existingVideos.length > 0 && !videoFile ? (
                <MediaList
                  medias={existingVideos}
                  onRemove={removeExistingMedia}
                  title="Vídeo atual"
                />
              ) : null}
              <UploadZone
                accept="video/*"
                label={existingVideos.length ? "Substituir vídeo" : "Adicionar vídeo"}
                onFiles={(files) => setVideoFile(files[0] ?? null)}
              />
              {videoFile ? (
                <div className="mini-row">
                  <Video size={16} aria-hidden="true" />
                  <div>
                    <strong>{videoFile.name}</strong>
                    <span>
                      {existingVideos.length
                        ? "Vai substituir o vídeo atual ao salvar."
                        : "Novo vídeo selecionado."}
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => setVideoFile(null)}
                    title="Remover vídeo selecionado"
                    type="button"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </section>

            <p style={{ color: "var(--mid)", margin: 0 }}>
              No catálogo público, as fotos aparecem primeiro. Se tiver vídeo, ele aparece
              depois das fotos no carrossel.
            </p>

            <label className="field">
              <span className="form-label">Link do convite no Canva (editável)</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, canvaUrl: event.target.value })
                }
                type="url"
                value={form.canvaUrl}
              />
              <span style={{ color: "var(--mid)", fontSize: 13 }}>
                Esse link aparece somente para você, não aparece para as clientes.
              </span>
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
              ) : editingArte ? (
                <Save size={17} aria-hidden="true" />
              ) : (
                <ImagePlus size={17} aria-hidden="true" />
              )}
              {editingArte ? "Salvar alterações" : "Salvar convite"}
            </button>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function MediaList({
  medias,
  onRemove,
  title
}: {
  medias: CatalogMedia[];
  onRemove: (media: CatalogMedia) => void;
  title: string;
}) {
  return (
    <div className="grid-panel">
      <p className="page-kicker">{title}</p>
      <div className="media-manager-grid">
        {medias.map((media) => (
          <div className="media-manager-item" key={media.id}>
            <MediaPreview media={media} label="" />
            <button
              className="icon-button"
              onClick={() => onRemove(media)}
              title="Remover mídia"
              type="button"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectedFiles({
  files,
  onRemove,
  title
}: {
  files: File[];
  onRemove: (index: number) => void;
  title: string;
}) {
  return (
    <div className="grid-panel">
      <p className="page-kicker">{title}</p>
      <div style={{ display: "grid", gap: 8 }}>
        {files.map((file, index) => (
          <div className="mini-row" key={`${file.name}-${index}`}>
            <ImagePlus size={16} aria-hidden="true" />
            <div>
              <strong>{file.name}</strong>
              <span>{formatFileSize(file.size)}</span>
            </div>
            <button
              className="icon-button"
              onClick={() => onRemove(index)}
              title="Remover foto selecionada"
              type="button"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
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

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
