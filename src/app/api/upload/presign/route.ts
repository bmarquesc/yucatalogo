import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireConviteira } from "@/lib/auth";
import { getPublicR2Url, getR2BucketName, getR2Client } from "@/lib/r2";

export const dynamic = "force-dynamic";

type PresignPayload = {
  contentType?: string;
  fileName?: string;
  pasta?: string;
};

export async function POST(request: Request) {
  try {
    const { conviteira } = await requireConviteira();
    const body = await readJson<PresignPayload>(request);

    if (body.pasta !== "artes" && body.pasta !== "perfil") {
      return jsonError("Pasta invalida.");
    }

    if (!body.fileName?.trim()) {
      return jsonError("Nome do arquivo nao informado.");
    }

    const rawExtension = body.fileName.split(".").pop()?.toLowerCase() || "bin";
    const extension = rawExtension.replace(/[^a-z0-9]/g, "") || "bin";
    const contentType = body.contentType || "application/octet-stream";
    const key = `${body.pasta}/${conviteira.id}/${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(
      getR2Client(),
      new PutObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
        ContentType: contentType
      }),
      { expiresIn: 600 }
    );

    return NextResponse.json({
      key,
      uploadUrl,
      url: getPublicR2Url(key)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
