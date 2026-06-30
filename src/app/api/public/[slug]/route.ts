import { NextResponse } from "next/server";

import { getPublicCatalog } from "@/db/queries";
import { handleRouteError, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const catalog = await getPublicCatalog(params.slug);

    if (!catalog) {
      return jsonError("Catálogo não encontrado.", 404);
    }

    return NextResponse.json(catalog);
  } catch (error) {
    return handleRouteError(error);
  }
}
