import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/storage/s3";
import { withAuthGuard } from "@/lib/auth/guard";

export const POST = withAuthGuard(
  "user:read",
  async (req: NextRequest) => {
    try {
      const agencyId = req.headers.get("x-agency-id");
      if (!agencyId) {
        return NextResponse.json({ error: "Agency context missing" }, { status: 400 });
      }

      const body = await req.json();
      const { fileName, mimeType, projectId, taskId } = body;

      if (!fileName || !mimeType) {
        return NextResponse.json({ error: "fileName and mimeType are required" }, { status: 400 });
      }

      // Enforce multi-tenant folder structure: agencies/{agencyId}/[project|task|general]/{filename}
      const targetFolder = taskId ? `tasks/${taskId}` : projectId ? `projects/${projectId}` : "general";
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileKey = `agencies/${agencyId}/${targetFolder}/${Date.now()}-${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        ContentType: mimeType,
      });

      // Temporary URL valid for 15 minutes
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

      // Build stable public access URL
      const publicBaseUrl = process.env.S3_PUBLIC_DOMAIN || `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com`;
      const stableFileUrl = `${publicBaseUrl}/${fileKey}`;

      return NextResponse.json({
        uploadUrl,     // Used by client to PUT raw file bytes
        stableFileUrl, // Stored in PostgreSQL
        fileKey,
      });
    } catch (error: any) {
      console.error("[PRESIGNED_URL_ERROR]", error);
      return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
  }
);