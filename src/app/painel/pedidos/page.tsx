import { PedidosClient } from "@/components/painel/PedidosClient";
import { requireConviteira } from "@/lib/auth";

export default async function PedidosPage() {
  const { conviteira } = await requireConviteira();

  return <PedidosClient productionSlug={conviteira.slug} />;
}
