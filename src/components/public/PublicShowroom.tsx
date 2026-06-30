"use client";

import { ChevronLeft, ChevronRight, ExternalLink, MessageCircle, X } from "lucide-react";
import {
  FormEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties
} from "react";

import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { CatalogCampo, PublicCatalog } from "@/types/catalog";

export function PublicShowroom({ catalog }: { catalog: PublicCatalog }) {
  const [activeTipo, setActiveTipo] = useState("todos");
  const [search, setSearch] = useState("");
  const [selectedArte, setSelectedArte] =
    useState<PublicCatalog["artes"][number] | null>(null);

  const activeTipoData = catalog.tipos.find((tipo) => tipo.id === activeTipo);
  const filteredArtes = useMemo(() => {
    const byTipo =
      activeTipo === "todos"
        ? catalog.artes
        : catalog.artes.filter((arte) => arte.tipoId === activeTipo);

    if (activeTipoData?.modoDisplay !== "busca" || !search.trim()) {
      return byTipo;
    }

    const term = search.toLowerCase();
    return byTipo.filter(
      (arte) =>
        arte.nome.toLowerCase().includes(term) ||
        arte.tema?.toLowerCase().includes(term)
    );
  }, [activeTipo, activeTipoData?.modoDisplay, catalog.artes, search]);

  const shellStyle = {
    "--brand-primary": catalog.conviteira.corPrincipal || "#0D0D0D",
    "--brand-accent": catalog.conviteira.corDestaque || "#C9A96E"
  } as CSSProperties;

  return (
    <main className="public-shell" style={shellStyle}>
      {catalog.conviteira.bannerUrl ? (
        <div style={{ aspectRatio: "16 / 5", overflow: "hidden", width: "100%" }}>
          <img
            alt=""
            src={catalog.conviteira.bannerUrl}
            style={{ height: "100%", objectFit: "cover", width: "100%" }}
          />
        </div>
      ) : null}

      <header
        style={{
          alignItems: "center",
          display: "flex",
          gap: 18,
          margin: "0 auto",
          maxWidth: 1120,
          padding: "28px 16px 18px"
        }}
      >
        {catalog.conviteira.logoUrl ? (
          <img
            alt=""
            src={catalog.conviteira.logoUrl}
            style={{
              border: "2px solid var(--brand-accent)",
              borderRadius: "50%",
              height: 76,
              objectFit: "cover",
              width: 76
            }}
          />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1
            className="font-display"
            style={{
              color: "var(--brand-primary)",
              fontSize: "clamp(38px, 8vw, 76px)",
              fontWeight: 500,
              lineHeight: 0.9,
              margin: 0,
              overflowWrap: "anywhere"
            }}
          >
            {catalog.conviteira.nomeMarca}
          </h1>
          {catalog.conviteira.bio ? (
            <p
              style={{
                color: "color-mix(in srgb, var(--brand-primary), transparent 28%)",
                margin: "12px 0 0",
                maxWidth: 680
              }}
            >
              {catalog.conviteira.bio}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Tipos de convite"
        style={{
          borderBlock: "1px solid rgba(0,0,0,0.08)",
          margin: "0 auto",
          maxWidth: 1120,
          overflowX: "auto",
          padding: "0 16px",
          whiteSpace: "nowrap"
        }}
      >
        <button
          onClick={() => setActiveTipo("todos")}
          style={tabStyle(activeTipo === "todos")}
          type="button"
        >
          Todos
        </button>
        {catalog.tipos.map((tipo) => (
          <button
            key={tipo.id}
            onClick={() => {
              setActiveTipo(tipo.id);
              setSearch("");
            }}
            style={tabStyle(activeTipo === tipo.id)}
            type="button"
          >
            {tipo.emoji ? `${tipo.emoji} ` : ""}
            {tipo.nomePublico}
          </button>
        ))}
      </nav>

      <section style={{ margin: "0 auto", maxWidth: 1120, padding: "20px 16px 54px" }}>
        {activeTipoData?.modoDisplay === "demonstracao" &&
        activeTipoData.descricaoPublica ? (
          <p
            className="font-display"
            style={{
              color: "var(--brand-primary)",
              fontSize: "clamp(24px, 4vw, 38px)",
              lineHeight: 1.05,
              margin: "0 0 18px",
              maxWidth: 720
            }}
          >
            {activeTipoData.descricaoPublica}
          </p>
        ) : null}

        {activeTipoData?.modoDisplay === "busca" ? (
          <input
            aria-label="Buscar convite"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou tema"
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 4,
              marginBottom: 18,
              minHeight: 44,
              padding: "10px 12px",
              width: "min(100%, 420px)"
            }}
            value={search}
          />
        ) : null}

        {filteredArtes.length ? (
          <div
            style={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(auto-fill, minmax(min(46%, 280px), 1fr))"
            }}
          >
            {filteredArtes.map((arte) => {
              const cover = arte.midias.find((media) => media.tipo === "imagem") ?? arte.midias[0];
              return (
                <button
                  aria-label={arte.nome}
                  key={arte.id}
                  onClick={() => setSelectedArte(arte)}
                  style={{
                    aspectRatio: "4 / 5",
                    background: "var(--brand-accent)",
                    border: 0,
                    color: "#fff",
                    display: "grid",
                    fontSize: 42,
                    overflow: "hidden",
                    padding: 0,
                    placeItems: "center"
                  }}
                  type="button"
                >
                  {cover ? (
                    <ShowroomMedia media={cover} label={arte.nome} />
                  ) : (
                    <span>{arte.emoji || "🎉"}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.1)",
              color: "var(--brand-primary)",
              padding: 28,
              textAlign: "center"
            }}
          >
            Nenhum convite disponível.
          </div>
        )}
      </section>

      {selectedArte ? (
        <ShowroomModal
          arte={selectedArte}
          campos={catalog.campos}
          nomeMarca={catalog.conviteira.nomeMarca}
          onClose={() => setSelectedArte(null)}
          whatsapp={catalog.conviteira.whatsapp}
        />
      ) : null}
    </main>
  );
}

function ShowroomModal({
  arte,
  campos,
  nomeMarca,
  onClose,
  whatsapp
}: {
  arte: PublicCatalog["artes"][number];
  campos: CatalogCampo[];
  nomeMarca: string;
  onClose: () => void;
  whatsapp: string;
}) {
  const [slide, setSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const slides = arte.midias;
  const currentSlide = slides[slide];

  useEffect(() => {
    setSlide(0);
    setFormOpen(false);
    setValues({});
  }, [arte.id]);

  function move(direction: -1 | 1) {
    setSlide((current) => {
      if (!slides.length) {
        return 0;
      }
      return (current + direction + slides.length) % slides.length;
    });
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStart === null) {
      return;
    }

    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 40) {
      move(delta > 0 ? -1 : 1);
    }
    setTouchStart(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tipo = arte.tipo?.nomePublico ? ` - ${arte.tipo.nomePublico}` : "";
    const lines = [
      `*Pedido - ${nomeMarca}*`,
      "",
      `*Arte:* ${arte.nome}${tipo}`,
      ...campos
        .filter((campo) => values[campo.id])
        .map((campo) => `*${campo.label}:* ${values[campo.id]}`)
    ];

    window.open(buildWhatsAppUrl(whatsapp, lines.join("\n")), "_blank", "noopener");
  }

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      style={{
        background: "rgba(0,0,0,0.72)",
        inset: 0,
        position: "fixed",
        zIndex: 100
      }}
    >
      <section
        aria-modal="true"
        className="showroom-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          background: "#fff",
          color: "var(--brand-primary)",
          display: "grid",
          height: "100%",
          marginLeft: "auto",
          maxWidth: 1180,
          overflow: "auto"
        }}
      >
        <div
          onTouchEnd={handleTouchEnd}
          onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
          style={{
            alignItems: "center",
            background: "#0D0D0D",
            display: "grid",
            minHeight: 420,
            overflow: "hidden",
            placeItems: "center",
            position: "relative"
          }}
        >
          {currentSlide ? (
            <ShowroomMedia media={currentSlide} label={arte.nome} contained />
          ) : (
            <span style={{ color: "#fff", fontSize: 70 }}>{arte.emoji || "🎉"}</span>
          )}

          {slides.length > 1 ? (
            <>
              <button
                aria-label="Slide anterior"
                onClick={() => move(-1)}
                style={carouselButtonStyle("left")}
                type="button"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <button
                aria-label="Próximo slide"
                onClick={() => move(1)}
                style={carouselButtonStyle("right")}
                type="button"
              >
                <ChevronRight size={22} aria-hidden="true" />
              </button>
              <div
                style={{
                  bottom: 16,
                  display: "flex",
                  gap: 6,
                  left: "50%",
                  position: "absolute",
                  transform: "translateX(-50%)"
                }}
              >
                {slides.map((media, index) => (
                  <button
                    aria-label={`Ir para slide ${index + 1}`}
                    key={media.id}
                    onClick={() => setSlide(index)}
                    style={{
                      background:
                        index === slide ? "var(--brand-accent)" : "rgba(255,255,255,0.52)",
                      border: 0,
                      borderRadius: "50%",
                      height: 8,
                      padding: 0,
                      width: 8
                    }}
                    type="button"
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 18, padding: 22 }}>
          <button
            aria-label="Fechar"
            onClick={onClose}
            style={{
              alignItems: "center",
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 4,
              display: "inline-flex",
              height: 36,
              justifyContent: "center",
              justifySelf: "end",
              width: 36
            }}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div>
            <p
              style={{
                color: "color-mix(in srgb, var(--brand-primary), transparent 42%)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                margin: 0,
                textTransform: "uppercase"
              }}
            >
              {arte.tipo?.nomePublico || "Convite"}
            </p>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(36px, 6vw, 58px)",
                fontWeight: 500,
                lineHeight: 0.95,
                margin: "8px 0 0"
              }}
            >
              {arte.nome}
            </h2>
            {arte.tema ? <p style={{ margin: "10px 0 0" }}>{arte.tema}</p> : null}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {arte.linkPublicado ? (
              <a
                href={arte.linkPublicado}
                rel="noreferrer"
                style={publicButtonStyle(false)}
                target="_blank"
              >
                <ExternalLink size={17} aria-hidden="true" />
                Ver convite ao vivo
              </a>
            ) : null}
            <button
              onClick={() => setFormOpen((current) => !current)}
              style={publicButtonStyle(true)}
              type="button"
            >
              <MessageCircle size={17} aria-hidden="true" />
              Quero esse convite
            </button>
          </div>

          {formOpen ? (
            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              {campos.map((campo) => (
                <PublicField
                  campo={campo}
                  key={campo.id}
                  onChange={(value) =>
                    setValues((current) => ({ ...current, [campo.id]: value }))
                  }
                  value={values[campo.id] || ""}
                />
              ))}
              <button style={publicButtonStyle(true)} type="submit">
                <MessageCircle size={17} aria-hidden="true" />
                Enviar pedido
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PublicField({
  campo,
  onChange,
  value
}: {
  campo: CatalogCampo;
  onChange: (value: string) => void;
  value: string;
}) {
  const baseProps = {
    required: Boolean(campo.obrigatorio),
    style: publicInputStyle,
    value,
    onChange: (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => onChange(event.target.value)
  };

  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}
      >
        {campo.label}
      </span>
      {campo.tipo === "textarea" ? (
        <textarea {...baseProps} style={{ ...publicInputStyle, minHeight: 88 }} />
      ) : campo.tipo === "select" ? (
        <select {...baseProps}>
          <option value="">Selecione</option>
          {campo.opcoes?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...baseProps}
          type={campo.tipo === "telefone" ? "tel" : inputType(campo.tipo)}
        />
      )}
    </label>
  );
}

function ShowroomMedia({
  media,
  label,
  contained = false
}: {
  media: PublicCatalog["artes"][number]["midias"][number];
  label: string;
  contained?: boolean;
}) {
  const style = {
    height: "100%",
    objectFit: contained ? "contain" : "cover",
    width: "100%"
  } as CSSProperties;

  if (media.tipo === "video") {
    return <video controls={contained} playsInline src={media.url} style={style} />;
  }

  return <img alt={label} src={media.url} style={style} />;
}

function tabStyle(active: boolean): CSSProperties {
  return {
    background: "transparent",
    border: 0,
    borderBottom: active ? "2px solid var(--brand-accent)" : "2px solid transparent",
    color: "var(--brand-primary)",
    fontWeight: active ? 700 : 500,
    minHeight: 52,
    padding: "0 16px"
  };
}

function carouselButtonStyle(side: "left" | "right"): CSSProperties {
  const placement = side === "left" ? { left: 14 } : { right: 14 };

  return {
    alignItems: "center",
    background: "rgba(255,255,255,0.9)",
    border: 0,
    borderRadius: "50%",
    display: "inline-flex",
    height: 42,
    justifyContent: "center",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 42,
    ...placement
  };
}

function publicButtonStyle(primary: boolean): CSSProperties {
  return {
    alignItems: "center",
    background: primary ? "var(--brand-primary)" : "transparent",
    border: `1px solid ${primary ? "var(--brand-primary)" : "rgba(0,0,0,0.14)"}`,
    borderRadius: 4,
    color: primary ? "#fff" : "var(--brand-primary)",
    display: "inline-flex",
    fontWeight: 700,
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    padding: "0 14px"
  };
}

const publicInputStyle: CSSProperties = {
  border: "1px solid rgba(0,0,0,0.14)",
  borderRadius: 4,
  minHeight: 42,
  padding: "10px 11px",
  width: "100%"
};

function inputType(tipo: CatalogCampo["tipo"]) {
  if (tipo === "data") {
    return "date";
  }

  if (tipo === "hora") {
    return "time";
  }

  return "text";
}
