import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { gastosCaixa } from "@/db/schema";
import { handleRouteError, jsonError } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const [deleted] = await getDb()
      .delete(gastosCaixa)
      .where(
        and(eq(gastosCaixa.id, params.id), eq(gastosCaixa.conviteiraId, conviteira.id))
      )
      .returning();

    if (!deleted) {
      return jsonError("Gasto não encontrado.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
