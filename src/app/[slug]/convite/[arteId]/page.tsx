import { notFound } from "next/navigation";

import { PublicInvitationDetail } from "@/components/public/PublicShowroom";
import { getPublicCatalog } from "@/db/queries";

export const dynamic = "force-dynamic";

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
