"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Menu,
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
  const [selectedSubfilters, setSelectedSubfilters] = useState<Record<string, string>>({});
  const [openFiltroId, setOpenFiltroId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const featuredArte = catalog.artes.find((arte) => arte.midias.length);
  const featuredMedia =
    featuredArte?.midias.find((media) => media.tipo === "imagem") ??
    featuredArte?.midias[0] ??
    null;
  const heroImage =
    catalog.conviteira.bannerUrl ||
    catalog.conviteira.bannerMobileUrl ||
    featuredMedia?.url ||
    "";
  const hasCustomBanner = Boolean(
    catalog.conviteira.bannerUrl || catalog.conviteira.bannerMobileUrl
  );
  const hasMobileBanner = Boolean(catalog.conviteira.bannerMobileUrl);
  const filterGroups = catalog.filtros.filter((filtro) => filtro.subfiltros.length);

  const activeTipoData = catalog.tipos.find((tipo) => tipo.id === activeTipo);
  const filteredArtes = useMemo(() => {
    const byTipo =
      activeTipo === "todos"
        ? catalog.artes
        : catalog.artes.filter((arte) => arte.tipoId === activeTipo);
    const activeSubfilterIds = Object.values(selectedSubfilters).filter(Boolean);
    const bySubfilters = activeSubfilterIds.length
      ? byTipo.filter((arte) =>
          activeSubfilterIds.every((subfilterId) =>
            arte.subfiltros.some((subfiltro) => subfiltro.id === subfilterId)
          )
        )
      : byTipo;

    const term = normalizeCatalogSearch(search);

    if (!term) {
      return bySubfilters;
    }

    return bySubfilters.filter((arte) =>
      normalizeCatalogSearch(
        [
          arte.nome,
          arte.tema,
          arte.tipo?.nomePublico,
          arte.tipo?.nome,
          ...arte.subfiltros.map((subfiltro) => subfiltro.nome)
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(term)
    );
  }, [activeTipo, catalog.artes, search, selectedSubfilters]);

  const selectedFont = getCatalogFontOption(catalog.conviteira.fonteCatalogo);
  const shellStyle = {
    "--brand-primary": catalog.conviteira.corPrincipal || "#0D0D0D",
    "--brand-accent": catalog.conviteira.corDestaque || "#C9A96E",
    "--catalog-background": catalog.conviteira.corFundo || "#FFFAF6",
    "--catalog-card": catalog.conviteira.corCard || "#FFFFFF",
    "--catalog-text":
      catalog.conviteira.corTexto || catalog.conviteira.corPrincipal || "#0D0D0D",
    "--catalog-font-body": selectedFont.bodyFamily,
    "--catalog-font-display": selectedFont.displayFamily,
    "--public-hero-image-fit": "cover"
  } as CSSProperties;

  function selectTipo(tipoId: string) {
    setActiveTipo(tipoId);
    setIsMobileMenuOpen(false);
  }

  function clearSubfilters() {
    setSelectedSubfilters({});
    setOpenFiltroId(null);
  }

  function selectSubfilter(filtroId: string, subfiltroId: string) {
    setSelectedSubfilters((current) => ({
      ...current,
      [filtroId]: current[filtroId] === subfiltroId ? "" : subfiltroId
    }));
    setOpenFiltroId(null);
    setIsMobileMenuOpen(false);
  }

  return (
    <main className="public-shell" style={shellStyle}>
      <header className="public-shop-header">
        <button
          aria-label="Abrir filtros"
          className="public-mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(true)}
          type="button"
        >
          <Menu size={24} aria-hidden="true" />
        </button>

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

        <nav aria-label="Filtros principais" className="public-shop-nav">
          <button
            className="public-shop-nav-button"
            data-active={activeTipo === "todos"}
            onClick={() => selectTipo("todos")}
            type="button"
          >
            Todos
          </button>
          {catalog.tipos.map((tipo) => (
            <button
              className="public-shop-nav-button"
              data-active={activeTipo === tipo.id}
              key={tipo.id}
              onClick={() => selectTipo(tipo.id)}
              type="button"
            >
              {tipo.nomePublico}
            </button>
          ))}
          {filterGroups.map((filtro) => (
            <div className="public-filter-group public-header-filter" key={filtro.id}>
              <button
                aria-expanded={openFiltroId === filtro.id}
                className="public-shop-nav-button public-shop-filter-button"
                data-active={Boolean(selectedSubfilters[filtro.id])}
                onClick={() =>
                  setOpenFiltroId((current) => (current === filtro.id ? null : filtro.id))
                }
                type="button"
              >
                <span>{filtro.nome}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {openFiltroId === filtro.id ? (
                <div className="public-filter-options">
                  <button
                    className="public-filter-chip"
                    data-active={!selectedSubfilters[filtro.id]}
                    onClick={() => {
                      setSelectedSubfilters((current) => ({
                        ...current,
                        [filtro.id]: ""
                      }));
                      setOpenFiltroId(null);
                    }}
                    type="button"
                  >
                    Todos
                  </button>
                  {filtro.subfiltros.map((subfiltro) => (
                    <button
                      className="public-filter-chip"
                      data-active={selectedSubfilters[filtro.id] === subfiltro.id}
                      key={subfiltro.id}
                      onClick={() => selectSubfilter(filtro.id, subfiltro.id)}
                      type="button"
                    >
                      {subfiltro.nome}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <a className="public-shop-search-button" href="#catalog-search">
          <Search size={18} aria-hidden="true" />
          <span>Pesquisar</span>
        </a>
      </header>

      {isMobileMenuOpen ? (
        <div
          className="public-mobile-menu-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <aside
            aria-label="Filtros do catalogo"
            className="public-mobile-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="public-mobile-menu-header">
              <strong>{catalog.conviteira.nomeMarca}</strong>
              <button
                aria-label="Fechar filtros"
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <label className="public-search-wrap">
              <Search aria-hidden="true" className="public-search-icon" size={17} />
              <input
                aria-label="Buscar convite"
                className="public-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por tema, nome ou tipo"
                value={search}
              />
            </label>

            <div className="public-mobile-menu-section">
              <p>Convites</p>
              <button
                className="public-mobile-menu-option"
                data-active={activeTipo === "todos"}
                onClick={() => selectTipo("todos")}
                type="button"
              >
                Todos
              </button>
              {catalog.tipos.map((tipo) => (
                <button
                  className="public-mobile-menu-option"
                  data-active={activeTipo === tipo.id}
                  key={tipo.id}
                  onClick={() => selectTipo(tipo.id)}
                  type="button"
                >
                  {tipo.nomePublico}
                </button>
              ))}
            </div>

            {filterGroups.map((filtro) => (
              <div className="public-mobile-menu-section" key={filtro.id}>
                <p>{filtro.nome}</p>
                <button
                  className="public-mobile-menu-option"
                  data-active={!selectedSubfilters[filtro.id]}
                  onClick={() => {
                    setSelectedSubfilters((current) => ({
                      ...current,
                      [filtro.id]: ""
                    }));
                    setIsMobileMenuOpen(false);
                  }}
                  type="button"
                >
                  Todos
                </button>
                {filtro.subfiltros.map((subfiltro) => (
                  <button
                    className="public-mobile-menu-option"
                    data-active={selectedSubfilters[filtro.id] === subfiltro.id}
                    key={subfiltro.id}
                    onClick={() => selectSubfilter(filtro.id, subfiltro.id)}
                    type="button"
                  >
                    {subfiltro.nome}
                  </button>
                ))}
              </div>
            ))}

            <button
              className="public-mobile-menu-clear"
              onClick={clearSubfilters}
              type="button"
            >
              Limpar filtros
            </button>
          </aside>
        </div>
      ) : null}

      <section
        className="public-hero"
        data-has-custom-banner={hasCustomBanner ? "true" : undefined}
        data-has-mobile-banner={hasMobileBanner ? "true" : undefined}
        style={
          !hasCustomBanner && heroImage
            ? ({ "--public-hero-image": `url("${heroImage}")` } as CSSProperties)
            : undefined
        }
      >
        {hasCustomBanner ? (
          <picture className="public-hero-picture">
            {catalog.conviteira.bannerMobileUrl ? (
              <source
                media="(max-width: 768px)"
                srcSet={catalog.conviteira.bannerMobileUrl}
              />
            ) : null}
            <img
              alt={`Banner ${catalog.conviteira.nomeMarca}`}
              className="public-hero-banner"
              src={catalog.conviteira.bannerUrl || catalog.conviteira.bannerMobileUrl || ""}
            />
          </picture>
        ) : (
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
        )}
      </section>

      <section className="public-content" id="catalogo">
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
            <label className="public-search-wrap" id="catalog-search">
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
                  <a
                    aria-label={arte.nome}
                    className="public-art-card-button"
                    href={`/${catalog.conviteira.slug}/convite/${arte.id}`}
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
                      <span className="public-art-cta">Ver convite</span>
                    </span>
                  </a>
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

      <FloatingWhatsAppButton
        nomeMarca={catalog.conviteira.nomeMarca}
        whatsapp={catalog.conviteira.whatsapp}
      />
    </main>
  );
}

export function PublicInvitationDetail({
  arte,
  catalog
}: {
  arte: PublicCatalog["artes"][number];
  catalog: PublicCatalog;
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
  const orderFields = useMemo(
    () => buildPublicOrderFields(catalog.campos),
    [catalog.campos]
  );
  const selectedFont = getCatalogFontOption(catalog.conviteira.fonteCatalogo);
  const priceLabel = formatCatalogPrice(arte.valor, arte.valorAPartir);
  const shellStyle = {
    "--brand-primary": catalog.conviteira.corPrincipal || "#0D0D0D",
    "--brand-accent": catalog.conviteira.corDestaque || "#C9A96E",
    "--catalog-background": catalog.conviteira.corFundo || "#FFFAF6",
    "--catalog-card": catalog.conviteira.corCard || "#FFFFFF",
    "--catalog-text":
      catalog.conviteira.corTexto || catalog.conviteira.corPrincipal || "#0D0D0D",
    "--catalog-font-body": selectedFont.bodyFamily,
    "--catalog-font-display": selectedFont.displayFamily
  } as CSSProperties;

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
      nomeMarca: catalog.conviteira.nomeMarca,
      servicosAdicionais,
      tipoNome: arte.tipo?.nomePublico,
      values
    });
    const whatsappTarget = window.open("", "_blank");

    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(catalog.conviteira.slug)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            arteId: arte.id,
            servicosAdicionais,
            values
          })
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        whatsappTarget?.close();
        setOrderError(data.error || "Nao foi possivel enviar o pedido.");
        return;
      }

      const whatsappUrl = buildWhatsAppUrl(catalog.conviteira.whatsapp, message);

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
      setOrderError("Nao foi possivel enviar o pedido. Tente novamente.");
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
    <main className="public-shell" style={shellStyle}>
      <section className="public-product-page">
        <a className="public-back-link" href={`/${catalog.conviteira.slug}#catalogo`}>
          Voltar ao catalogo
        </a>

        <section className="public-product-layout">
          <div className="public-product-gallery">
            <div
              className="public-product-stage"
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
                  aria-label="Expandir midia"
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
                    aria-label="Proximo slide"
                    className="carousel-button carousel-button-right"
                    onClick={() => move(1)}
                    type="button"
                  >
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            {slides.length > 1 ? (
              <div className="public-product-thumbs">
                {slides.map((media, index) => (
                  <button
                    aria-label={`Ver midia ${index + 1}`}
                    className="public-product-thumb"
                    data-active={index === slide}
                    key={media.id}
                    onClick={() => setSlide(index)}
                    type="button"
                  >
                    <ShowroomMedia
                      contained
                      controls={false}
                      label={arte.nome}
                      media={media}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="public-product-info">
            <p className="showroom-kicker">
              {arte.tipo?.nomePublico || "Convite digital"}
            </p>
            <h1 className="font-display public-product-title">{arte.nome}</h1>
            {priceLabel ? <p className="showroom-price">{priceLabel}</p> : null}
            <p className="public-product-description">
              {arte.tipo?.descricaoPublica ||
                "Modelo digital personalizado com as informacoes do evento, pronto para compartilhar com os convidados."}
            </p>

            <dl className="public-product-meta">
              {arte.tipo?.nomePublico ? (
                <div>
                  <dt>Tipo</dt>
                  <dd>{arte.tipo.nomePublico}</dd>
                </div>
              ) : null}
              {arte.tema ? (
                <div>
                  <dt>Tema</dt>
                  <dd>{arte.tema}</dd>
                </div>
              ) : null}
              {arte.subfiltros.length ? (
                <div>
                  <dt>Filtros</dt>
                  <dd>{arte.subfiltros.map((subfiltro) => subfiltro.nome).join(", ")}</dd>
                </div>
              ) : null}
              <div>
                <dt>Entrega</dt>
                <dd>Digital, pronta para enviar pelo WhatsApp</dd>
              </div>
            </dl>

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
          </aside>
        </section>
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

      <FloatingWhatsAppButton
        nomeMarca={catalog.conviteira.nomeMarca}
        whatsapp={catalog.conviteira.whatsapp}
      />
    </main>
  );
}

function FloatingWhatsAppButton({
  nomeMarca,
  whatsapp
}: {
  nomeMarca: string;
  whatsapp: string;
}) {
  return (
    <a
      aria-label="Falar no WhatsApp"
      className="public-whatsapp-float"
      href={buildWhatsAppUrl(
        whatsapp,
        `Olá! Vim pelo catálogo ${nomeMarca} e quero falar sobre um convite.`
      )}
      rel="noreferrer"
      target="_blank"
    >
      <svg aria-hidden="true" viewBox="0 0 32 32">
        <path d="M16.03 4C9.42 4 4.05 9.28 4.05 15.79c0 2.23.64 4.39 1.86 6.27L4 28l6.13-1.82a12.15 12.15 0 0 0 5.9 1.52C22.64 27.7 28 22.41 28 15.9 28 9.39 22.64 4 16.03 4Zm0 21.56c-1.79 0-3.54-.49-5.05-1.42l-.36-.22-3.62 1.07 1.12-3.47-.24-.36a9.82 9.82 0 0 1-1.68-5.37c0-5.33 4.41-9.66 9.83-9.66s9.83 4.42 9.83 9.77c0 5.32-4.41 9.66-9.83 9.66Zm5.39-7.25c-.3-.15-1.75-.85-2.02-.94-.27-.1-.47-.15-.67.15-.2.29-.77.94-.94 1.13-.17.2-.35.22-.64.08-.3-.15-1.26-.45-2.39-1.45-.88-.78-1.48-1.73-1.65-2.02-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.52-.08-.15-.67-1.58-.92-2.16-.24-.56-.49-.48-.67-.49h-.57c-.2 0-.52.07-.79.37-.27.29-1.04 1-1.04 2.43s1.07 2.82 1.22 3.02c.15.2 2.1 3.14 5.08 4.4.71.3 1.26.48 1.69.62.71.22 1.36.19 1.87.12.57-.08 1.75-.7 2-1.38.25-.68.25-1.26.17-1.38-.07-.12-.27-.2-.57-.35Z" />
      </svg>
    </a>
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
  controls,
  media,
  label,
  onOpen
}: {
  contained?: boolean;
  controls?: boolean;
  media: PublicCatalog["artes"][number]["midias"][number];
  label: string;
  onOpen?: () => void;
}) {
  const style = {
    cursor: onOpen ? "zoom-in" : undefined,
    objectFit: contained ? "contain" : "cover",
    ...(contained
      ? {}
      : {
          height: "100%",
          width: "100%"
        })
  } as CSSProperties;
  const className = contained
    ? "showroom-media showroom-media-contained"
    : "showroom-media";

  if (media.tipo === "video") {
    return (
      <video
        className={className}
        controls={controls ?? contained}
        playsInline
        src={media.url}
        style={style}
      />
    );
  }

  return (
    <img
      alt={label}
      className={className}
      onClick={onOpen}
      src={media.url}
      style={style}
    />
  );
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
