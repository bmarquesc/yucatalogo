import { notFound } from "next/navigation";

import { PublicShowroom } from "@/components/public/PublicShowroom";
import { getPublicCatalog } from "@/db/queries";

export const dynamic = "force-dynamic";

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
