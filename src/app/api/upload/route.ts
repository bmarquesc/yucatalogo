import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { handleRouteError, jsonError } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import { getPublicR2Url, getR2BucketName, getR2Client } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const {
      conviteira
    } = await requireConviteira();
    const formData = await request.formData();
    const file = formData.get("file");
    const pasta = formData.get("pasta");

    if (!(file instanceof File)) {
      return jsonError("Arquivo não informado.");
    }

    if (pasta !== "artes" && pasta !== "perfil") {
      return jsonError("Pasta inválida.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const key = `${pasta}/${conviteira.id}/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream"
      })
    );

    return NextResponse.json({ key, url: getPublicR2Url(key) });
  } catch (error) {
    return handleRouteError(error);
  }
}
