"use client";

import { Copy, Loader2, Palette, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { UploadZone } from "@/components/painel/UploadZone";
import { useToast } from "@/components/painel/ToastProvider";
import {
  CATALOG_FONT_OPTIONS,
  DEFAULT_CATALOG_FONT,
  getCatalogFontOption
} from "@/lib/catalogFonts";
import { buildPublicCatalogUrl } from "@/lib/domains";

type ConviteiraForm = {
  nomeMarca: string;
  slug: string;
  bio: string;
  whatsapp: string;
  logoUrl: string;
  bannerUrl: string;
  bannerMobileUrl: string;
  corPrincipal: string;
  corDestaque: string;
  corFundo: string;
  corCard: string;
  corTexto: string;
  fonteCatalogo: string;
};

const defaultProfileColors = {
  corPrincipal: "#0D0D0D",
  corDestaque: "#C9A96E",
  corFundo: "#FFFAF6",
  corCard: "#FFFFFF",
  corTexto: "#0D0D0D"
};

const emptyForm: ConviteiraForm = {
  nomeMarca: "",
  slug: "",
  bio: "",
  whatsapp: "",
  logoUrl: "",
  bannerUrl: "",
  bannerMobileUrl: "",
  ...defaultProfileColors,
  fonteCatalogo: DEFAULT_CATALOG_FONT
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type PaletteColors = Pick<
  ConviteiraForm,
  "corPrincipal" | "corDestaque" | "corFundo" | "corCard" | "corTexto"
>;

function toHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((item) => item + item)
          .join("")
      : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function mixHex(color: string, target: string, amount: number) {
  const from = hexToRgb(color);
  const to = hexToRgb(target);

  return toHex({
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount)
  });
}

function rgbToHsl({ r, g, b }: Rgb) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { hue: 0, saturation: 0, lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === red
      ? (green - blue) / delta + (green < blue ? 6 : 0)
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;

  return { hue: hue / 6, saturation, lightness };
}

function getLuminance(color: Rgb) {
  const values = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function extractPaletteFromImage(src: string): Promise<PaletteColors> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const maxSize = 120;
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas indisponivel.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map<
    string,
    Rgb & { count: number; lightness: number; saturation: number; luminance: number }
  >();

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3] / 255;
    if (alpha < 0.38) continue;

    const rgb = {
      r: Math.round(pixels[index] * alpha + 255 * (1 - alpha)),
      g: Math.round(pixels[index + 1] * alpha + 255 * (1 - alpha)),
      b: Math.round(pixels[index + 2] * alpha + 255 * (1 - alpha))
    };
    const hsl = rgbToHsl(rgb);

    if (hsl.lightness > 0.94 && hsl.saturation < 0.16) continue;

    const bucket = {
      r: Math.min(255, Math.round(rgb.r / 32) * 32),
      g: Math.min(255, Math.round(rgb.g / 32) * 32),
      b: Math.min(255, Math.round(rgb.b / 32) * 32)
    };
    const key = `${bucket.r}-${bucket.g}-${bucket.b}`;
    const existing = buckets.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      const bucketHsl = rgbToHsl(bucket);
      buckets.set(key, {
        ...bucket,
        count: 1,
        lightness: bucketHsl.lightness,
        saturation: bucketHsl.saturation,
        luminance: getLuminance(bucket)
      });
    }
  }

  const swatches = Array.from(buckets.values());
  if (!swatches.length) return defaultProfileColors;

  const primary =
    [...swatches].sort(
      (a, b) =>
        b.count * (1 - b.lightness + 0.22) -
        a.count * (1 - a.lightness + 0.22)
    )[0] ?? swatches[0];
  const accent =
    [...swatches]
      .filter((swatch) => swatch.saturation > 0.16 && swatch.lightness > 0.16)
      .sort(
        (a, b) =>
          b.count * (b.saturation + 0.18) * (1 - Math.abs(b.lightness - 0.52)) -
          a.count * (a.saturation + 0.18) * (1 - Math.abs(a.lightness - 0.52))
      )[0] ?? primary;

  const primaryHex = toHex(primary);
  const accentHex = toHex(accent);
  const backgroundHex = mixHex(accentHex, "#FFFFFF", 0.9);

  return {
    corPrincipal: primaryHex,
    corDestaque: accentHex,
    corFundo: backgroundHex,
    corCard: mixHex(accentHex, "#FFFFFF", 0.97),
    corTexto: getLuminance(hexToRgb(backgroundHex)) < 0.45 ? "#FFFFFF" : primaryHex
  };
}

export function PerfilClient() {
  const notify = useToast();
  const router = useRouter();
  const [form, setForm] = useState<ConviteiraForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [extractingColors, setExtractingColors] = useState(false);
  const [showOnboardingMessage, setShowOnboardingMessage] = useState(false);
  const [fallbackOrigin, setFallbackOrigin] = useState("");

  const publicUrl = buildPublicCatalogUrl(form.slug || "seu-slug", fallbackOrigin);

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
      bannerMobileUrl: data.conviteira.bannerMobileUrl || "",
      corPrincipal: data.conviteira.corPrincipal || defaultProfileColors.corPrincipal,
      corDestaque: data.conviteira.corDestaque || defaultProfileColors.corDestaque,
      corFundo: data.conviteira.corFundo || defaultProfileColors.corFundo,
      corCard: data.conviteira.corCard || defaultProfileColors.corCard,
      corTexto: data.conviteira.corTexto || defaultProfileColors.corTexto,
      fonteCatalogo: data.conviteira.fonteCatalogo || DEFAULT_CATALOG_FONT
    });
    setLoading(false);
  }

  useEffect(() => {
    setFallbackOrigin(window.location.origin);
    setShowOnboardingMessage(new URLSearchParams(window.location.search).has("novo"));
    void load();
  }, []);

  async function uploadProfileFile(
    file: File,
    field: "logoUrl" | "bannerUrl" | "bannerMobileUrl"
  ) {
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

    if (field === "logoUrl") {
      const objectUrl = URL.createObjectURL(file);
      try {
        const palette = await extractPaletteFromImage(objectUrl);
        setForm((current) => ({ ...current, [field]: data.url, ...palette }));
        notify("Logo enviada e cores ajustadas.");
        return;
      } catch {
        setForm((current) => ({ ...current, [field]: data.url }));
        notify("Logo enviada. Nao foi possivel ler as cores automaticamente.");
        return;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    setForm((current) => ({ ...current, [field]: data.url }));
    notify("Arquivo enviado.");
  }

  async function applyLogoColors() {
    if (!form.logoUrl) {
      notify("Envie uma logo primeiro.", "error");
      return;
    }

    setExtractingColors(true);
    try {
      const palette = await extractPaletteFromImage(form.logoUrl);
      setForm((current) => ({ ...current, ...palette }));
      notify("Cores ajustadas pela logo.");
    } catch {
      notify("Nao foi possivel ler as cores dessa logo. Envie a logo novamente para aplicar.", "error");
    } finally {
      setExtractingColors(false);
    }
  }

  function clearImage(field: "logoUrl" | "bannerUrl" | "bannerMobileUrl") {
    setForm((current) => ({ ...current, [field]: "" }));
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
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
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
            <label className="field">
              <span className="form-label">Cor do fundo</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, corFundo: event.target.value })
                }
                type="color"
                value={form.corFundo}
              />
            </label>
            <label className="field">
              <span className="form-label">Cor dos cards</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, corCard: event.target.value })
                }
                type="color"
                value={form.corCard}
              />
            </label>
            <label className="field">
              <span className="form-label">Cor das letras</span>
              <input
                className="input"
                onChange={(event) =>
                  setForm({ ...form, corTexto: event.target.value })
                }
                type="color"
                value={form.corTexto}
              />
            </label>
          </div>

          <div
            style={{
              alignItems: "center",
              border: "1px solid var(--rule)",
              borderRadius: 6,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
              padding: 12
            }}
          >
            <Palette size={20} aria-hidden="true" />
            <div>
              <strong>Usar cores da logo</strong>
              <p style={{ color: "var(--mid)", margin: "4px 0 0" }}>
                O sistema lê a logo e ajusta as cores do catálogo automaticamente.
              </p>
            </div>
            <button
              className="button secondary"
              disabled={!form.logoUrl || extractingColors}
              onClick={applyLogoColors}
              type="button"
            >
              {extractingColors ? (
                <Loader2 className="animate-spin" size={16} aria-hidden="true" />
              ) : (
                <Palette size={16} aria-hidden="true" />
              )}
              Aplicar
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <UploadZone
                accept="image/*"
                label={uploading === "logoUrl" ? "Enviando logo" : "Enviar logo"}
                onFiles={(files) => {
                  if (files[0]) void uploadProfileFile(files[0], "logoUrl");
                }}
              />
              {form.logoUrl ? (
                <button
                  className="button secondary"
                  onClick={() => clearImage("logoUrl")}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir logo
                </button>
              ) : null}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <UploadZone
                accept="image/*"
                hint="Tamanho recomendado: 1080 x 515 px"
                label={
                  uploading === "bannerUrl" ? "Enviando banner" : "Enviar banner"
                }
                onFiles={(files) => {
                  if (files[0]) void uploadProfileFile(files[0], "bannerUrl");
                }}
              />
              {form.bannerUrl ? (
                <button
                  className="button secondary"
                  onClick={() => clearImage("bannerUrl")}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir banner
                </button>
              ) : null}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <UploadZone
                accept="image/*"
                hint="Para celular: 800 x 1300 px"
                label={
                  uploading === "bannerMobileUrl"
                    ? "Enviando banner mobile"
                    : "Enviar banner mobile"
                }
                onFiles={(files) => {
                  if (files[0]) void uploadProfileFile(files[0], "bannerMobileUrl");
                }}
              />
              {form.bannerMobileUrl ? (
                <button
                  className="button secondary"
                  onClick={() => clearImage("bannerMobileUrl")}
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir banner mobile
                </button>
              ) : null}
            </div>
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
              background: form.corFundo,
              border: "1px solid var(--rule)",
              color: form.corTexto,
              fontFamily: selectedFont.bodyFamily,
              marginTop: 14,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                aspectRatio: "1080 / 515",
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
                  style={{ height: "100%", objectFit: "contain", width: "100%" }}
                />
              ) : (
                <span style={{ color: "#fff", fontWeight: 700 }}>
                  Banner 1080 x 515 px
                </span>
              )}
            </div>
            <div
              style={{
                background: form.corDestaque,
                borderTop: "1px solid var(--rule)",
                display: "grid",
                gridTemplateColumns: "minmax(120px, 180px) minmax(0, 1fr)",
                gap: 16,
                padding: 18
              }}
            >
              <div
                style={{
                  aspectRatio: "400 / 650",
                  background: form.corCard,
                  borderRadius: 8,
                  overflow: "hidden"
                }}
              >
                {form.bannerMobileUrl ? (
                  <img
                    alt=""
                    src={form.bannerMobileUrl}
                    style={{ height: "100%", objectFit: "cover", width: "100%" }}
                  />
                ) : (
                  <span
                    style={{
                      color: form.corTexto,
                      display: "grid",
                      fontSize: 12,
                      fontWeight: 800,
                      height: "100%",
                      placeItems: "center",
                      textAlign: "center"
                    }}
                  >
                    Banner mobile
                    <br />
                    800 x 1300 px
                  </span>
                )}
              </div>
              <div style={{ alignSelf: "center" }}>
                <p
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    margin: 0,
                    textTransform: "uppercase"
                  }}
                >
                  Preview celular
                </p>
                <p style={{ color: "#fff", fontWeight: 700, margin: "8px 0 0" }}>
                  Use uma arte vertical para o banner ocupar melhor a tela do celular.
                </p>
              </div>
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
                    color: form.corPrincipal,
                    fontFamily: selectedFont.displayFamily,
                    fontSize: 32,
                    lineHeight: 1,
                    margin: 0
                  }}
                >
                  {form.nomeMarca || "Sua marca"}
                </h2>
                <p style={{ color: form.corTexto, margin: "8px 0 0" }}>
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
