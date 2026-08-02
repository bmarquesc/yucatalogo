"use client";

import { Copy, Loader2, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { UploadZone } from "@/components/painel/UploadZone";
import { useToast } from "@/components/painel/ToastProvider";
import {
  CATALOG_FONT_OPTIONS,
  DEFAULT_CATALOG_FONT,
  getCatalogFontOption
} from "@/lib/catalogFonts";

type ConviteiraForm = {
  nomeMarca: string;
  slug: string;
  bio: string;
  whatsapp: string;
  logoUrl: string;
  bannerUrl: string;
  corPrincipal: string;
  corDestaque: string;
  fonteCatalogo: string;
};

const emptyForm: ConviteiraForm = {
  nomeMarca: "",
  slug: "",
  bio: "",
  whatsapp: "",
  logoUrl: "",
  bannerUrl: "",
  corPrincipal: "#0D0D0D",
  corDestaque: "#C9A96E",
  fonteCatalogo: DEFAULT_CATALOG_FONT
};

export function PerfilClient() {
  const notify = useToast();
  const router = useRouter();
  const [form, setForm] = useState<ConviteiraForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showOnboardingMessage, setShowOnboardingMessage] = useState(false);

  const publicUrl = `https://yucatalogo.site/${form.slug || "seu-slug"}`;

  async function load() {
    setLoading(true);
    const response = await fetch("/api/conviteira");

    if (!response.ok) {
      notify("Não foi possível carregar o perfil.", "error");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as {
      conviteira: Partial<ConviteiraForm>;
    };
    setForm({
      nomeMarca: data.conviteira.nomeMarca || "",
      slug: data.conviteira.slug || "",
      bio: data.conviteira.bio || "",
      whatsapp: data.conviteira.whatsapp || "",
      logoUrl: data.conviteira.logoUrl || "",
      bannerUrl: data.conviteira.bannerUrl || "",
      corPrincipal: data.conviteira.corPrincipal || "#0D0D0D",
      corDestaque: data.conviteira.corDestaque || "#C9A96E",
      fonteCatalogo: data.conviteira.fonteCatalogo || DEFAULT_CATALOG_FONT
    });
    setLoading(false);
  }

  useEffect(() => {
    setShowOnboardingMessage(new URLSearchParams(window.location.search).has("novo"));
    void load();
  }, []);

  async function uploadProfileFile(file: File, field: "logoUrl" | "bannerUrl") {
    setUploading(field);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pasta", "perfil");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    setUploading(null);

    if (!response.ok) {
      notify("Não foi possível enviar o arquivo.", "error");
      return;
    }

    const data = (await response.json()) as { url: string };
    setForm((current) => ({ ...current, [field]: data.url }));
    notify("Arquivo enviado.");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/conviteira", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      notify(data.error || "Não foi possível salvar o perfil.", "error");
      return;
    }

    notify("Perfil atualizado.");
    router.refresh();
  }

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicUrl);
    notify("Link do catálogo copiado.");
  }

  if (loading) {
    return (
      <section className="panel-page">
        <div className="empty-state">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        </div>
      </section>
    );
  }

  const selectedFont = getCatalogFontOption(form.fonteCatalogo);

  return (
    <section className="panel-page">
      <header className="page-header">
        <div>
          <p className="page-kicker">Painel</p>
          <h1 className="page-title">Perfil</h1>
          <p className="page-subtitle">
            Ajuste a marca, as cores e o endereço público do catálogo.
          </p>
        </div>
        <button className="button secondary" onClick={copyPublicLink} type="button">
          <Copy size={17} aria-hidden="true" />
          Copiar link
        </button>
      </header>

      {showOnboardingMessage ? (
        <div className="panel-card" style={{ borderColor: "var(--gold)" }}>
          Complete seu perfil para ativar seu catálogo.
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
        }}
      >
        <form className="panel-card grid-panel" onSubmit={save}>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <label className="field">
              <span className="form-label">Nome da marca</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, nomeMarca: event.target.value })
                }
                required
                value={form.nomeMarca}
              />
            </label>
            <label className="field">
              <span className="form-label">Slug</span>
              <input
                className="input"
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                required
                value={form.slug}
              />
            </label>
          </div>

          <label className="field">
            <span className="form-label">WhatsApp</span>
            <input
              className="input"
              onChange={(event) =>
                setForm({ ...form, whatsapp: event.target.value })
              }
              required
              value={form.whatsapp}
            />
          </label>

          <label className="field">
            <span className="form-label">Bio</span>
            <textarea
              className="textarea"
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              value={form.bio}
            />
          </label>

          <label className="field">
            <span className="form-label">Fonte do catálogo</span>
            <select
              className="select"
              onChange={(event) =>
                setForm({ ...form, fonteCatalogo: event.target.value })
              }
              value={form.fonteCatalogo}
            >
              {CATALOG_FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label} - {font.description}
                </option>
              ))}
            </select>
          </label>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <label className="field">
              <span className="form-label">Cor principal</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, corPrincipal: event.target.value })
                }
                type="color"
                value={form.corPrincipal}
              />
            </label>
            <label className="field">
              <span className="form-label">Cor destaque</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, corDestaque: event.target.value })
                }
                type="color"
                value={form.corDestaque}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <UploadZone
              accept="image/*"
              label={uploading === "logoUrl" ? "Enviando logo" : "Enviar logo"}
              onFiles={(files) => {
                if (files[0]) void uploadProfileFile(files[0], "logoUrl");
              }}
            />
            <UploadZone
              accept="image/*"
              label={
                uploading === "bannerUrl" ? "Enviando banner" : "Enviar banner"
              }
              onFiles={(files) => {
                if (files[0]) void uploadProfileFile(files[0], "bannerUrl");
              }}
            />
          </div>

          <button className="button" disabled={saving} type="submit">
            {saving ? (
              <Loader2 className="animate-spin" size={17} aria-hidden="true" />
            ) : (
              <Save size={17} aria-hidden="true" />
            )}
            Salvar perfil
          </button>
        </form>

        <aside className="panel-card">
          <p className="page-kicker">Preview</p>
          <div
            style={{
              border: "1px solid var(--rule)",
              color: form.corPrincipal,
              fontFamily: selectedFont.bodyFamily,
              marginTop: 14,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                aspectRatio: "16 / 7",
                background: form.corDestaque,
                display: "grid",
                overflow: "hidden",
                placeItems: "center"
              }}
            >
              {form.bannerUrl ? (
                <img
                  alt=""
                  src={form.bannerUrl}
                  style={{ height: "100%", objectFit: "cover", width: "100%" }}
                />
              ) : (
                <span style={{ color: "#fff", fontWeight: 700 }}>Banner</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 14, padding: 18 }}>
              <div
                style={{
                  border: `2px solid ${form.corDestaque}`,
                  borderRadius: "50%",
                  display: "grid",
                  height: 64,
                  overflow: "hidden",
                  placeItems: "center",
                  width: 64
                }}
              >
                {form.logoUrl ? (
                  <img
                    alt=""
                    src={form.logoUrl}
                    style={{ height: "100%", objectFit: "cover", width: "100%" }}
                  />
                ) : (
                  <span>{form.nomeMarca.charAt(0) || "M"}</span>
                )}
              </div>
              <div>
                <h2
                  className="font-display"
                  style={{
                    fontFamily: selectedFont.displayFamily,
                    fontSize: 32,
                    lineHeight: 1,
                    margin: 0
                  }}
                >
                  {form.nomeMarca || "Sua marca"}
                </h2>
                <p style={{ color: "var(--mid)", margin: "8px 0 0" }}>
                  {form.bio || "Bio do catálogo"}
                </p>
              </div>
            </div>
          </div>
          <p style={{ color: "var(--mid)", marginBottom: 0, marginTop: 14 }}>
            {publicUrl}
          </p>
        </aside>
      </div>
    </section>
  );
}
