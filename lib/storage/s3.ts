import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.S3_BUCKET_NAME) {
  console.warn("⚠️ S3_BUCKET_NAME environment variable is not defined.");
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT, // Required if using Cloudflare R2 / MinIO (leave undefined for standard AWS S3)
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});