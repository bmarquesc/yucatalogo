import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import { getCaixaForConviteira } from "@/db/queries";
import { handleRouteError } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    noStore();
    const { conviteira } = await requireConviteira();
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7);
    const caixa = await getCaixaForConviteira(conviteira.id, mes);

    return NextResponse.json(
      { caixa },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
