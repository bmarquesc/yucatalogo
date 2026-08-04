import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicShowroom } from "@/components/public/PublicShowroom";
import { getPublicCatalog } from "@/db/queries";
import { buildPublicCatalogMetadata } from "@/lib/publicMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const catalog = await getPublicCatalog(params.slug);

  return buildPublicCatalogMetadata(catalog);
}

export default async function PublicCatalogPage({
  params
}: {
  params: { slug: string };
}) {
  const catalog = await getPublicCatalog(params.slug);

  if (!catalog) {
    notFound();
  }

  return <PublicShowroom catalog={catalog} />;
}
