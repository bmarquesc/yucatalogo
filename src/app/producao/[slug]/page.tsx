import { notFound } from "next/navigation";

import { ProductionQueue } from "@/components/public/ProductionQueue";
import { getConviteiraBySlug } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function ProducaoPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { tag?: string };
}) {
  const conviteira = await getConviteiraBySlug(params.slug);

  if (!conviteira) {
    notFound();
  }

  return (
    <ProductionQueue
      conviteira={{
        slug: conviteira.slug,
        nomeMarca: conviteira.nomeMarca,
        logoUrl: conviteira.logoUrl,
        corPrincipal: conviteira.corPrincipal,
        corDestaque: conviteira.corDestaque
      }}
      initialTag={searchParams.tag || ""}
    />
  );
}
