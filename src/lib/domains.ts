export function getConfiguredPublicCatalogBaseUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_CATALOG_PUBLIC_BASE_URL);
}

export function buildPublicCatalogUrl(slug: string, fallbackOrigin = "") {
  const baseUrl = getConfiguredPublicCatalogBaseUrl() || normalizeBaseUrl(fallbackOrigin);
  const normalizedSlug = slug.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedSlug}` : `/${normalizedSlug}`;
}

export function isPublicCatalogHost(hostHeader: string | null | undefined) {
  const host = normalizeHost(hostHeader);

  if (!host) {
    return false;
  }

  return getPublicCatalogHosts().includes(host);
}

function getPublicCatalogHosts() {
  return Array.from(
    new Set([
      ...parseHosts(process.env.CATALOG_PUBLIC_DOMAINS),
      ...parseHosts(process.env.NEXT_PUBLIC_CATALOG_PUBLIC_BASE_URL)
    ])
  );
}

function parseHosts(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => normalizeHost(item))
    .filter((host): host is string => Boolean(host));
}

function normalizeBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeHost(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host;
  } catch {
    return trimmed.split("/")[0] || null;
  }
}
