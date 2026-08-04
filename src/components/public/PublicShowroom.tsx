"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Maximize2,
  MessageCircle,
  Menu,
  Search,
  ShoppingBag,
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

import { getCatalogFontOption } from "@/lib/catalogFonts";
import {
  buildPublicOrderFields,
  buildPublicOrderMessage,
  normalizeCatalogSearch,
  type PublicOrderField
} from "@/lib/publicOrder";
import {
  ORDER_SERVICE_OPTIONS,
  type OrderServiceId
} from "@/lib/orderServices";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { CatalogCampo, PublicCatalog } from "@/types/catalog";

export function PublicShowroom({ catalog }: { catalog: PublicCatalog }) {
  const [activeTipo, setActiveTipo] = useState("todos");
  const [search, setSearch] = useState("");
  const [selectedArte, setSelectedArte] =
    useState<PublicCatalog["artes"][number] | null>(null);
  const featuredArte = catalog.artes.find((arte) => arte.midias.length);
  const featuredMedia =
    featuredArte?.midias.find((media) => media.tipo === "imagem") ??
    featuredArte?.midias[0] ??
    null;
  const heroImage = catalog.conviteira.bannerUrl || featuredMedia?.url || "";

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
      <div className="public-announcement">
        Escolha seu convite pelo WhatsApp.
      </div>

      <header className="public-shop-header">
        <a className="public-shop-brand" href="#catalogo">
          {catalog.conviteira.logoUrl ? (
            <img
              alt=""
              className="public-logo"
              src={catalog.conviteira.logoUrl}
            />
          ) : (
            <span className="public-logo-fallback">
              {catalog.conviteira.nomeMarca.charAt(0)}
            </span>
          )}
          <span>{catalog.conviteira.nomeMarca}</span>
        </a>

        <nav className="public-shop-nav" aria-label="Navegação do catálogo">
          <a href="#catalogo">Modelos</a>
          <a href="#colecoes">Coleções</a>
          <a
            href={`https://wa.me/${catalog.conviteira.whatsapp}`}
            rel="noreferrer"
            target="_blank"
          >
            Contato
          </a>
        </nav>

        <div className="public-shop-actions" aria-hidden="true">
          <Search size={19} />
          <ShoppingBag size={19} />
          <Menu size={20} />
        </div>
      </header>

      <section
        className="public-hero"
        style={
          heroImage
            ? ({ "--public-hero-image": `url("${heroImage}")` } as CSSProperties)
            : undefined
        }
      >
        <div className="public-hero-copy">
          <p className="public-hero-kicker">Catálogo digital</p>
          <h1 className="font-display public-hero-title">
            {catalog.conviteira.nomeMarca}
          </h1>
          <p className="public-hero-text">
            {catalog.conviteira.bio ||
              "Convites digitais personalizados para transformar a festa em um momento ainda mais especial."}
          </p>
          <a className="public-hero-button" href="#catalogo">
            Conhecer modelos
          </a>
        </div>
      </section>

      <section className="public-feature-strip" id="colecoes">
        <div>
          <strong>Personalizado</strong>
          <span>Dados do evento feitos sob medida.</span>
        </div>
        <div>
          <strong>Digital</strong>
          <span>Pronto para compartilhar no WhatsApp.</span>
        </div>
        <div>
          <strong>Com extras</strong>
          <span>Filtros, lista, confirmação e mascote.</span>
        </div>
      </section>

      <nav aria-label="Tipos de convite" className="public-tabs" id="catalogo">
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
        <div className="public-section-header">
          <div>
            <p className="public-section-kicker">
              {activeTipo === "todos" ? "Vitrine" : "Coleção"}
            </p>
            <h2 className="font-display public-section-title">
              {activeTipoData?.nomePublico || "Últimos lançamentos"}
              {activeTipo === "todos" ? " ✨" : null}
            </h2>
            {activeTipoData?.descricaoPublica ? (
              <p className="public-tipo-description">
                {activeTipoData.descricaoPublica}
              </p>
            ) : (
              <p className="public-tipo-description">
                Veja os modelos disponíveis e escolha o convite que combina com a
                sua comemoração.
              </p>
            )}
          </div>

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
        </div>

        {filteredArtes.length ? (
          <div className="public-art-grid">
            {filteredArtes.map((arte, index) => {
              const cover =
                arte.midias.find((media) => media.tipo === "imagem") ??
                arte.midias[0];
              const priceLabel = formatCatalogPrice(arte.valor, arte.valorAPartir);

              return (
                <article className="public-art-card" key={arte.id}>
                  <button
                    aria-label={arte.nome}
                    className="public-art-card-button"
                    onClick={() => setSelectedArte(arte)}
                    type="button"
                  >
                    <span className="public-art-media">
                      {cover ? (
                        <ShowroomMedia media={cover} label={arte.nome} />
                      ) : (
                        <ShowroomPlaceholder />
                      )}
                      <span className="public-art-badge">
                        {index < 4 ? "Novo" : arte.tipo?.nomePublico || "Convite"}
                      </span>
                    </span>
                    <span className="public-art-caption">
                      <span className="public-art-type">
                        {arte.tipo?.nomePublico || "Convite digital"}
                      </span>
                      <strong className="public-art-name">{arte.nome}</strong>
                      {arte.tema ? (
                        <span className="public-art-theme">{arte.tema}</span>
                      ) : null}
                      {priceLabel ? (
                        <span className="public-art-price">{priceLabel}</span>
                      ) : null}
                      <span className="public-art-cta">Quero esse convite</span>
                    </span>
                  </button>
                </article>
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
          slug={catalog.conviteira.slug}
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
  slug,
  whatsapp
}: {
  arte: PublicCatalog["artes"][number];
  campos: CatalogCampo[];
  nomeMarca: string;
  onClose: () => void;
  slug: string;
  whatsapp: string;
}) {
  const [slide, setSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [sendingOrder, setSendingOrder] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [servicosAdicionais, setServicosAdicionais] = useState<OrderServiceId[]>([]);
  const slides = arte.midias;
  const currentSlide = slides[slide];
  const orderFields = useMemo(() => buildPublicOrderFields(campos), [campos]);
  const priceLabel = formatCatalogPrice(arte.valor, arte.valorAPartir);

  useEffect(() => {
    setSlide(0);
    setExpandedSlide(null);
    setOrderOpen(false);
    setOrderError("");
    setSendingOrder(false);
    setValues({});
    setServicosAdicionais([]);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderError("");
    setSendingOrder(true);

    const message = buildPublicOrderMessage({
      arteNome: arte.nome,
      fields: orderFields,
      nomeMarca,
      servicosAdicionais,
      tipoNome: arte.tipo?.nomePublico,
      values
    });
    const whatsappTarget = window.open("", "_blank");

    try {
      const response = await fetch(`/api/public/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          arteId: arte.id,
          servicosAdicionais,
          values
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        whatsappTarget?.close();
        setOrderError(data.error || "Não foi possível enviar o pedido.");
        return;
      }

      const whatsappUrl = buildWhatsAppUrl(whatsapp, message);

      if (whatsappTarget) {
        whatsappTarget.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }

      setValues({});
      setServicosAdicionais([]);
      setOrderOpen(false);
    } catch {
      whatsappTarget?.close();
      setOrderError("Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setSendingOrder(false);
    }
  }

  function toggleServicoAdicional(serviceId: OrderServiceId, selected: boolean) {
    setServicosAdicionais((current) =>
      selected
        ? Array.from(new Set([...current, serviceId]))
        : current.filter((item) => item !== serviceId)
    );
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
            {priceLabel ? <p className="showroom-price">{priceLabel}</p> : null}
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
              onClick={() => {
                setOrderError("");
                setOrderOpen(true);
              }}
              type="button"
            >
              <MessageCircle size={17} aria-hidden="true" />
              Quero esse convite
            </button>
          </div>
        </div>
      </section>

      {orderOpen ? (
        <PublicOrderPopup
          error={orderError}
          fields={orderFields}
          onChange={(id, value) =>
            setValues((current) => ({ ...current, [id]: value }))
          }
          onClose={() => {
            if (!sendingOrder) {
              setOrderOpen(false);
            }
          }}
          onSubmit={submit}
          sending={sendingOrder}
          servicosAdicionais={servicosAdicionais}
          onServicoChange={toggleServicoAdicional}
          values={values}
        />
      ) : null}

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

function PublicOrderPopup({
  error,
  fields,
  onChange,
  onClose,
  onSubmit,
  onServicoChange,
  sending,
  servicosAdicionais,
  values
}: {
  error: string;
  fields: PublicOrderField[];
  onChange: (id: string, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onServicoChange: (id: OrderServiceId, selected: boolean) => void;
  sending: boolean;
  servicosAdicionais: OrderServiceId[];
  values: Record<string, string>;
}) {
  return (
    <div
      className="public-order-popup-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="public-order-popup"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="public-order-popup-header">
          <div>
            <p className="showroom-kicker">Pedido</p>
            <h2 className="public-order-popup-title">Quero esse convite</h2>
          </div>
          <button
            aria-label="Fechar pedido"
            className="showroom-lightbox-close public-order-popup-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form className="public-order-form" onSubmit={onSubmit}>
          {fields.map((campo) => (
            <PublicField
              campo={campo}
              key={campo.id}
              onChange={(value) => onChange(campo.id, value)}
              value={values[campo.id] || ""}
            />
          ))}
          <section className="public-service-options">
            <p className="public-field-label">Serviços adicionais</p>
            <div className="public-service-list">
              {ORDER_SERVICE_OPTIONS.map((service) => (
                <label className="public-service-option" key={service.id}>
                  <input
                    checked={servicosAdicionais.includes(service.id)}
                    onChange={(event) =>
                      onServicoChange(service.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{service.label}</span>
                </label>
              ))}
            </div>
          </section>
          {error ? <p className="public-order-error">{error}</p> : null}
          <button className={publicButtonClass(true)} disabled={sending} type="submit">
            {sending ? (
              <Loader2 className="animate-spin" size={17} aria-hidden="true" />
            ) : (
              <MessageCircle size={17} aria-hidden="true" />
            )}
            {sending ? "Enviando..." : "Enviar pedido"}
          </button>
        </form>
      </section>
    </div>
  );
}

function PublicField({
  campo,
  onChange,
  value
}: {
  campo: PublicOrderField;
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
