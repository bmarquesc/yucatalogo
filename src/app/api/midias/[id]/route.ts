import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { arteMidias, artes } from "@/db/schema";
import { handleRouteError, jsonError } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import { getR2BucketName, getR2Client } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { conviteira } = await requireConviteira();
    const [media] = await getDb()
      .select()
      .from(arteMidias)
      .where(eq(arteMidias.id, params.id))
      .limit(1);

    if (!media) {
      return jsonError("Mídia não encontrada.", 404);
    }

    const [arte] = await getDb()
      .select({ id: artes.id })
      .from(artes)
      .where(and(eq(artes.id, media.arteId), eq(artes.conviteiraId, conviteira.id)))
      .limit(1);

    if (!arte) {
      return jsonError("Mídia não encontrada.", 404);
    }

    const sharedMediaRows = await getDb()
      .select({ id: arteMidias.id })
      .from(arteMidias)
      .where(eq(arteMidias.r2Key, media.r2Key))
      .limit(2);

    if (sharedMediaRows.length <= 1) {
      await getR2Client().send(
        new DeleteObjectCommand({
          Bucket: getR2BucketName(),
          Key: media.r2Key
        })
      );
    }

    await getDb().delete(arteMidias).where(eq(arteMidias.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
