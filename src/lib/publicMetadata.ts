import type { Metadata } from "next";

import type { PublicCatalog } from "@/types/catalog";

const PUBLIC_CATALOG_ICON = "/catalogo-favicon.svg";

function publicCatalogIcons(logoUrl: string | null): Metadata["icons"] {
  const icon = logoUrl || PUBLIC_CATALOG_ICON;

  return {
    icon,
    apple: icon
  };
}

function publicImages(...urls: Array<string | null | undefined>) {
  return urls.filter((url): url is string => Boolean(url));
}

function publicFallbackMetadata(): Metadata {
  return {
    title: "Catalogo",
    description: "Catalogo digital",
    icons: publicCatalogIcons(null)
  };
}

export function buildPublicCatalogMetadata(catalog: PublicCatalog | null): Metadata {
  if (!catalog) {
    return publicFallbackMetadata();
  }

  const title = catalog.conviteira.nomeMarca;
  const description =
    catalog.conviteira.bio || `Catalogo digital ${catalog.conviteira.nomeMarca}`;
  const images = publicImages(catalog.conviteira.bannerUrl, catalog.conviteira.logoUrl);

  return {
    title,
    description,
    icons: publicCatalogIcons(catalog.conviteira.logoUrl),
    openGraph: {
      title,
      description,
      images
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images
    }
  };
}

export function buildPublicInvitationMetadata(
  catalog: PublicCatalog | null,
  arteId: string
): Metadata {
  if (!catalog) {
    return publicFallbackMetadata();
  }

  const arte = catalog.artes.find((item) => item.id === arteId);
  const title = arte
    ? `${arte.nome} | ${catalog.conviteira.nomeMarca}`
    : catalog.conviteira.nomeMarca;
  const description =
    arte?.tipo?.descricaoPublica ||
    catalog.conviteira.bio ||
    `Catalogo digital ${catalog.conviteira.nomeMarca}`;
  const cover = arte?.midias.find((midia) => midia.tipo === "imagem") || arte?.midias[0];
  const images = publicImages(
    cover?.url,
    catalog.conviteira.bannerUrl,
    catalog.conviteira.logoUrl
  );

  return {
    title,
    description,
    icons: publicCatalogIcons(catalog.conviteira.logoUrl),
    openGraph: {
      title,
      description,
      images
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images
    }
  };
}
