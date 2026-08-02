import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import { getProducaoForTag } from "@/db/queries";
import { handleRouteError, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    noStore();
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag") || "";
    const producao = await getProducaoForTag(params.slug, tag);

    if (!producao) {
      return jsonError("Fila de produção não encontrada.", 404);
    }

    return NextResponse.json(
      { producao },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
