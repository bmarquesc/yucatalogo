import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicInvitationDetail } from "@/components/public/PublicShowroom";
import { getPublicCatalog } from "@/db/queries";
import { buildPublicInvitationMetadata } from "@/lib/publicMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: { slug: string; arteId: string };
}): Promise<Metadata> {
  const catalog = await getPublicCatalog(params.slug);

  return buildPublicInvitationMetadata(catalog, params.arteId);
}

export default async function PublicInvitationPage({
  params
}: {
  params: { slug: string; arteId: string };
}) {
  const catalog = await getPublicCatalog(params.slug);

  if (!catalog) {
    notFound();
  }

  const arte = catalog.artes.find((item) => item.id === params.arteId);

  if (!arte) {
    notFound();
  }

  return <PublicInvitationDetail arte={arte} catalog={catalog} />;
}
