"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  MessageCircle,
  Search,
  X
} from "lucide-react";
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
import { getCatalogFontOption } from "@/lib/catalogFonts";
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

    const term = normalizeCatalogSearch(search);

    if (!term) {
      return byTipo;
    }

    return byTipo.filter((arte) =>
      normalizeCatalogSearch(
        [arte.nome, arte.tema, arte.tipo?.nomePublico, arte.tipo?.nome]
          .filter(Boolean)
          .join(" ")
      ).includes(term)
    );
  }, [activeTipo, catalog.artes, search]);

  const selectedFont = getCatalogFontOption(catalog.conviteira.fonteCatalogo);
  const shellStyle = {
    "--brand-primary": catalog.conviteira.corPrincipal || "#0D0D0D",
    "--brand-accent": catalog.conviteira.corDestaque || "#C9A96E",
    "--catalog-font-body": selectedFont.bodyFamily,
    "--catalog-font-display": selectedFont.displayFamily
  } as CSSProperties;

  return (
    <main className="public-shell" style={shellStyle}>
      {catalog.conviteira.bannerUrl ? (
        <div className="public-banner">
          <img
            alt=""
            src={catalog.conviteira.bannerUrl}
            style={{ height: "100%", objectFit: "cover", width: "100%" }}
          />
        </div>
      ) : null}

      <header className="public-header">
        {catalog.conviteira.logoUrl ? (
          <img
            alt=""
            className="public-logo"
            src={catalog.conviteira.logoUrl}
          />
        ) : null}
        <div className="public-brand-copy">
          <h1
            className="font-display public-brand-title"
          >
            {catalog.conviteira.nomeMarca}
          </h1>
          {catalog.conviteira.bio ? (
            <p className="public-brand-bio">
              {catalog.conviteira.bio}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Tipos de convite"
        className="public-tabs"
      >
        <button
          className="public-tab"
          data-active={activeTipo === "todos"}
          onClick={() => setActiveTipo("todos")}
          type="button"
        >
          Todos
        </button>
        {catalog.tipos.map((tipo) => (
          <button
            className="public-tab"
            data-active={activeTipo === tipo.id}
            key={tipo.id}
            onClick={() => setActiveTipo(tipo.id)}
            type="button"
          >
            {tipo.nomePublico}
          </button>
        ))}
      </nav>

      <section className="public-content">
        {activeTipoData?.modoDisplay === "demonstracao" &&
        activeTipoData.descricaoPublica ? (
          <p className="public-tipo-description">
            {activeTipoData.descricaoPublica}
          </p>
        ) : null}

        {catalog.artes.length ? (
          <label className="public-search-wrap">
            <Search
              aria-hidden="true"
              className="public-search-icon"
              size={17}
            />
            <input
              aria-label="Buscar convite"
              className="public-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por tema, nome ou tipo"
              value={search}
            />
          </label>
        ) : null}

        {filteredArtes.length ? (
          <div className="public-art-grid">
            {filteredArtes.map((arte) => {
              const cover =
                arte.midias.find((media) => media.tipo === "imagem") ??
                arte.midias[0];
              return (
                <button
                  aria-label={arte.nome}
                  className="public-art-card"
                  key={arte.id}
                  onClick={() => setSelectedArte(arte)}
                  type="button"
                >
                  {cover ? (
                    <ShowroomMedia media={cover} label={arte.nome} />
                  ) : (
                    <ShowroomPlaceholder />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="public-empty">
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
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const slides = arte.midias;
  const currentSlide = slides[slide];

  useEffect(() => {
    setSlide(0);
    setExpandedSlide(null);
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
        .map((campo) => `*${campo.label}:* ${formatCampoValue(campo, values[campo.id])}`)
    ];

    window.open(buildWhatsAppUrl(whatsapp, lines.join("\n")), "_blank", "noopener");
  }

  return (
    <div
      className="showroom-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        aria-modal="true"
        className="showroom-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="showroom-media-stage"
          onTouchEnd={handleTouchEnd}
          onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        >
          {currentSlide ? (
            <ShowroomMedia
              contained
              label={arte.nome}
              media={currentSlide}
              onOpen={
                currentSlide.tipo === "imagem"
                  ? () => setExpandedSlide(slide)
                  : undefined
              }
            />
          ) : (
            <ShowroomPlaceholder contained />
          )}

          {currentSlide ? (
            <button
              aria-label="Expandir mídia"
              className="showroom-media-expand"
              onClick={() => setExpandedSlide(slide)}
              type="button"
            >
              <Maximize2 size={18} aria-hidden="true" />
            </button>
          ) : null}

          {slides.length > 1 ? (
            <>
              <button
                aria-label="Slide anterior"
                className="carousel-button carousel-button-left"
                onClick={() => move(-1)}
                type="button"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <button
                aria-label="Próximo slide"
                className="carousel-button carousel-button-right"
                onClick={() => move(1)}
                type="button"
              >
                <ChevronRight size={22} aria-hidden="true" />
              </button>
              <div className="showroom-dots">
                {slides.map((media, index) => (
                  <button
                    aria-label={`Ir para slide ${index + 1}`}
                    className="showroom-dot"
                    data-active={index === slide}
                    key={media.id}
                    onClick={() => setSlide(index)}
                    type="button"
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="showroom-details">
          <button
            aria-label="Fechar"
            className="showroom-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div>
            <p className="showroom-kicker">
              {arte.tipo?.nomePublico || "Convite"}
            </p>
            <h2
              className="font-display showroom-title"
            >
              {arte.nome}
            </h2>
            {arte.tema ? <p className="showroom-theme">{arte.tema}</p> : null}
          </div>

          <div className="showroom-actions">
            {arte.linkPublicado ? (
              <a
                className={publicButtonClass(false)}
                href={arte.linkPublicado}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={17} aria-hidden="true" />
                Abrir convite
              </a>
            ) : null}
            <button
              className={publicButtonClass(true)}
              onClick={() => setFormOpen((current) => !current)}
              type="button"
            >
              <MessageCircle size={17} aria-hidden="true" />
              Quero esse convite
            </button>
          </div>

          {formOpen ? (
            <form className="public-order-form" onSubmit={submit}>
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
              <button className={publicButtonClass(true)} type="submit">
                <MessageCircle size={17} aria-hidden="true" />
                Enviar pedido
              </button>
            </form>
          ) : null}
        </div>
      </section>

      {expandedSlide !== null && slides.length ? (
        <ExpandedShowroomMedia
          initialSlide={expandedSlide}
          label={arte.nome}
          onClose={() => setExpandedSlide(null)}
          slides={slides}
        />
      ) : null}
    </div>
  );
}

function ExpandedShowroomMedia({
  initialSlide,
  label,
  onClose,
  slides
}: {
  initialSlide: number;
  label: string;
  onClose: () => void;
  slides: PublicCatalog["artes"][number]["midias"];
}) {
  const [slide, setSlide] = useState(initialSlide);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const currentSlide = slides[slide];

  useEffect(() => {
    setSlide(initialSlide);
  }, [initialSlide]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  function move(direction: -1 | 1) {
    setSlide((current) => (current + direction + slides.length) % slides.length);
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

  return (
    <div
      className="showroom-lightbox"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="showroom-lightbox-header"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span>
          {slide + 1} / {slides.length}
        </span>
        <button
          aria-label="Fechar mídia expandida"
          className="showroom-lightbox-close"
          onClick={onClose}
          type="button"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div
        className="showroom-lightbox-stage"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchEnd={handleTouchEnd}
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      >
        {currentSlide ? (
          <ShowroomMedia contained label={label} media={currentSlide} />
        ) : (
          <ShowroomPlaceholder contained />
        )}

        {slides.length > 1 ? (
          <>
            <button
              aria-label="Slide anterior"
              className="carousel-button carousel-button-left"
              onClick={() => move(-1)}
              type="button"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
            <button
              aria-label="Próximo slide"
              className="carousel-button carousel-button-right"
              onClick={() => move(1)}
              type="button"
            >
              <ChevronRight size={24} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div
          className="showroom-lightbox-dots"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {slides.map((media, index) => (
            <button
              aria-label={`Ir para slide ${index + 1}`}
              className="showroom-dot"
              data-active={index === slide}
              key={media.id}
              onClick={() => setSlide(index)}
              type="button"
            />
          ))}
        </div>
      ) : null}
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
    className: "public-input",
    value,
    onChange: (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => onChange(event.target.value)
  };

  return (
    <label className="public-field">
      <span className="public-field-label">
        {campo.label}
      </span>
      {campo.tipo === "textarea" ? (
        <textarea {...baseProps} className="public-input public-textarea" />
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
  contained = false,
  media,
  label,
  onOpen
}: {
  contained?: boolean;
  media: PublicCatalog["artes"][number]["midias"][number];
  label: string;
  onOpen?: () => void;
}) {
  const style = {
    cursor: onOpen ? "zoom-in" : undefined,
    height: "100%",
    objectFit: contained ? "contain" : "cover",
    width: "100%"
  } as CSSProperties;

  if (media.tipo === "video") {
    return <video controls={contained} playsInline src={media.url} style={style} />;
  }

  return <img alt={label} onClick={onOpen} src={media.url} style={style} />;
}

function ShowroomPlaceholder({ contained = false }: { contained?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "#ECEAE5",
        borderRadius: contained ? 6 : 0,
        height: contained ? "min(70%, 420px)" : "100%",
        width: contained ? "min(70%, 420px)" : "100%"
      }}
    />
  );
}

function publicButtonClass(primary: boolean) {
  return primary
    ? "public-action public-action-primary"
    : "public-action public-action-secondary";
}

function inputType(tipo: CatalogCampo["tipo"]) {
  if (tipo === "data") {
    return "date";
  }

  if (tipo === "hora") {
    return "time";
  }

  return "text";
}

function formatCampoValue(campo: CatalogCampo, value: string) {
  if (campo.tipo !== "data") {
    return value;
  }

  return new Date(`${value}T12:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function normalizeCatalogSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
