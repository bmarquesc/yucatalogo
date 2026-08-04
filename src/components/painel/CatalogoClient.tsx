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
import type {
  CatalogArte,
  CatalogFiltro,
  CatalogMedia,
  CatalogTipo,
  TipoMidia
} from "@/types/catalog";

type UploadResult = {
  url: string;
  key: string;
};

type PresignedUpload = UploadResult & {
  uploadUrl: string;
};

type ArteForm = {
  nome: string;
  tipoId: string;
  tema: string;
  valor: string;
  valorAPartir: boolean;
  canvaUrl: string;
  linkPublicado: string;
  subfiltroIds: string[];
};

const MAX_IMAGES = 10;

const emptyForm: ArteForm = {
  nome: "",
  tipoId: "",
  tema: "",
  valor: "",
  valorAPartir: false,
  canvaUrl: "",
  linkPublicado: "",
  subfiltroIds: []
};

export function CatalogoClient() {
  const notify = useToast();
  const [artes, setArtes] = useState<CatalogArte[]>([]);
  const [tipos, setTipos] = useState<CatalogTipo[]>([]);
  const [filtros, setFiltros] = useState<CatalogFiltro[]>([]);
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
    const [artesResponse, tiposResponse, filtrosResponse] = await Promise.all([
      fetch("/api/artes"),
      fetch("/api/tipos"),
      fetch("/api/filtros")
    ]);

    if (!artesResponse.ok || !tiposResponse.ok || !filtrosResponse.ok) {
      notify("Não foi possível carregar o catálogo.", "error");
      setLoading(false);
      return;
    }

    const artesData = (await artesResponse.json()) as { artes: CatalogArte[] };
    const tiposData = (await tiposResponse.json()) as { tipos: CatalogTipo[] };
    const filtrosData = (await filtrosResponse.json()) as { filtros: CatalogFiltro[] };
    setArtes(artesData.artes);
    setTipos(tiposData.tipos);
    setFiltros(filtrosData.filtros);
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
      valor: centsToOptionalInput(arte.valor),
      valorAPartir: Boolean(arte.valorAPartir),
      canvaUrl: arte.canvaUrl || "",
      linkPublicado: arte.linkPublicado || "",
      subfiltroIds: arte.subfiltros.map((subfiltro) => subfiltro.id)
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

  function toggleSubfiltro(subfiltroId: string, selected: boolean) {
    setForm((current) => ({
      ...current,
      subfiltroIds: selected
        ? Array.from(new Set([...current.subfiltroIds, subfiltroId]))
        : current.subfiltroIds.filter((id) => id !== subfiltroId)
    }));
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

  async function uploadViaServer(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pasta", "artes");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error(
          `O arquivo "${file.name}" é grande demais para este envio. Tente compactar ou escolher outro arquivo.`
        );
      }

      throw new Error(
        await readResponseError(response, "Nao foi possivel enviar a midia.")
      );
    }

    return (await response.json()) as UploadResult;
  }

  async function uploadDirectToR2(file: File) {
    const contentType = file.type || "application/octet-stream";
    const presignResponse = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentType,
        fileName: file.name,
        pasta: "artes"
      })
    });

    if (!presignResponse.ok) {
      throw new Error(
        await readResponseError(
          presignResponse,
          "Nao foi possivel preparar o envio da midia."
        )
      );
    }

    const data = (await presignResponse.json()) as PresignedUpload;
    const uploadResponse = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error("Nao foi possivel enviar a midia para o armazenamento.");
    }

    return {
      key: data.key,
      url: data.url
    };
  }

  async function uploadFile(file: File, tipo: TipoMidia, ordem: number) {
    let data: UploadResult;

    try {
      data = await uploadDirectToR2(file);
    } catch {
      try {
        data = await uploadViaServer(file);
      } catch (fallbackError) {
        throw new Error(getUploadErrorMessage(file, fallbackError));
      }
    }

    return {
      tipo,
      url: data.url,
      r2Key: data.key,
      ordem
    };
  }

  async function uploadFiles(files: File[], tipo: TipoMidia, startOrder = 0) {
    const uploads: Awaited<ReturnType<typeof uploadFile>>[] = [];

    for (const [index, file] of files.entries()) {
      uploads.push(await uploadFile(file, tipo, startOrder + index));
    }

    return uploads;
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

    if (form.valor.trim() && moneyToOptionalCents(form.valor) === null) {
      notify("Informe um valor válido para o convite.", "error");
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
    const imageUploads = await uploadFiles(imageFiles, "imagem");
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
        valor: moneyToOptionalCents(form.valor),
        valorAPartir: form.valorAPartir,
        canvaUrl: form.canvaUrl,
        linkPublicado: form.linkPublicado,
        subfiltroIds: form.subfiltroIds,
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
        valor: moneyToOptionalCents(form.valor),
        valorAPartir: form.valorAPartir,
        canvaUrl: form.canvaUrl,
        linkPublicado: form.linkPublicado,
        subfiltroIds: form.subfiltroIds
      })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || "Não foi possível atualizar o convite.");
    }

    const imageUploads = await uploadFiles(
      imageFiles,
      "imagem",
      existingImages.length
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
            const priceLabel = formatCatalogPrice(arte.valor, arte.valorAPartir);

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
                  {priceLabel ? (
                    <strong style={{ color: "var(--black)", fontSize: 15 }}>
                      {priceLabel}
                    </strong>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span className="status-pill">{imageTotal}/10 fotos</span>
                    <span className="status-pill">
                      {hasVideo ? "1 vídeo" : "sem vídeo"}
                    </span>
                    {arte.subfiltros.map((subfiltro) => (
                      <span className="status-pill" key={subfiltro.id}>
                        {subfiltro.nome}
                      </span>
                    ))}
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

            {filtros.length ? (
              <section className="catalog-filter-picker">
                <div>
                  <p className="form-label">Filtros personalizados</p>
                  <p style={{ color: "var(--mid)", margin: "6px 0 0" }}>
                    Marque os subfiltros onde esse convite deve aparecer.
                  </p>
                </div>
                {filtros.map((filtro) => (
                  <div className="catalog-filter-group" key={filtro.id}>
                    <strong>{filtro.nome}</strong>
                    {filtro.subfiltros.length ? (
                      <div className="catalog-subfilter-list">
                        {filtro.subfiltros.map((subfiltro) => (
                          <label className="catalog-subfilter-option" key={subfiltro.id}>
                            <input
                              checked={form.subfiltroIds.includes(subfiltro.id)}
                              onChange={(event) =>
                                toggleSubfiltro(subfiltro.id, event.target.checked)
                              }
                              type="checkbox"
                            />
                            <span>{subfiltro.nome}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span className="catalog-filter-empty">
                        Crie subfiltros na pagina Filtros.
                      </span>
                    )}
                  </div>
                ))}
              </section>
            ) : null}

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))"
              }}
            >
              <label className="field">
                <span className="form-label">Valor do convite</span>
                <input
                  className="input"
                  inputMode="decimal"
                  onChange={(event) => setForm({ ...form, valor: event.target.value })}
                  placeholder="Opcional"
                  value={form.valor}
                />
              </label>

              <label className="field">
                <span className="form-label">Exibição do valor</span>
                <span
                  style={{
                    alignItems: "center",
                    background: "var(--paper)",
                    border: "1px solid var(--rule)",
                    borderRadius: 4,
                    display: "flex",
                    gap: 10,
                    minHeight: 42,
                    padding: "10px 11px"
                  }}
                >
                  <input
                    checked={form.valorAPartir}
                    onChange={(event) =>
                      setForm({ ...form, valorAPartir: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Mostrar como "A partir de"
                </span>
              </label>
            </div>

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

function formatCatalogPrice(
  value: number | null | undefined,
  startsAt: boolean | null | undefined
) {
  if (!value || value <= 0) {
    return "";
  }

  const formatted = new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(value / 100);

  return startsAt ? `A partir de ${formatted}` : formatted;
}

function moneyToOptionalCents(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const onlyNumber = trimmed.replace(/[^\d,.-]/g, "");
  const normalized = onlyNumber.includes(",")
    ? onlyNumber.replace(/\./g, "").replace(",", ".")
    : onlyNumber;
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function centsToOptionalInput(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return (value / 100).toFixed(2).replace(".", ",");
}

async function readResponseError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function getUploadErrorMessage(file: File, error: unknown) {
  const detail = error instanceof Error ? error.message : "";

  if (detail && detail !== "Failed to fetch") {
    return `${detail} Arquivo: ${file.name}.`;
  }

  return `Não foi possível enviar "${file.name}". Tente novamente ou use um arquivo menor.`;
}
