import { S3Client } from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

export function getR2Client() {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 credentials are not configured.");
    }

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  return r2Client;
}

export function getR2BucketName() {
  const bucket = process.env.R2_BUCKET_NAME;

  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is not configured.");
  }

  return bucket;
}

export function getPublicR2Url(key: string) {
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

  if (!publicUrl) {
    throw new Error("R2_PUBLIC_URL is not configured.");
  }

  return `${publicUrl}/${key}`;
}
