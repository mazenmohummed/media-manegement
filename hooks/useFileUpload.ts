import { useState } from "react";

interface UploadOptions {
  entityType: string; // e.g. "PROJECT", "USER_AVATAR"
  entityId: string;   // The target ID
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File, { entityType, entityId }: UploadOptions) => {
    setIsUploading(true);
    try {
      // 1. Get Presigned URL from Backend
      const presignedRes = await fetch("/api/attachments/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          entityType,
          entityId,
        }),
      });

      if (!presignedRes.ok) throw new Error("Failed to get upload authorization");
      const { uploadUrl, key, fileUrl } = await presignedRes.json();

      // 2. Direct Upload to Cloudflare R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Cloudflare R2 Direct Upload Failed");

      // 3. Register Attachment record in Database
      const recordRes = await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          key,
          url: fileUrl,
          mimeType: file.type,
          size: file.size,
          entityType,
          entityId,
        }),
      });

      if (!recordRes.ok) throw new Error("Failed to save attachment metadata");

      const { attachment } = await recordRes.json();
      return attachment; // Returns full attachment object with stable `url`
    } catch (err) {
      console.error("Upload error:", err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}