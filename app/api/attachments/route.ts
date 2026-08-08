import { NextRequest, NextResponse } from "next/server";
import { default as prisma } from "@/lib/prisma";
import { withAuthGuard } from "@/lib/auth/guard";

export const POST = withAuthGuard(
  "user:read",
  async (req: NextRequest) => {
    try {
      const agencyId = req.headers.get("x-agency-id");
      const userId = req.headers.get("x-user-id");

      if (!agencyId) {
        return NextResponse.json({ error: "Agency context missing" }, { status: 400 });
      }

      const body = await req.json();
      const { fileName, fileUrl, mimeType, size, description, projectId, taskId } = body;

      if (!fileName || !fileUrl) {
        return NextResponse.json({ error: "fileName and fileUrl are required" }, { status: 400 });
      }

      const attachment = await prisma.attachment.create({
        data: {
          fileName,
          fileUrl,
          mimeType: mimeType || null,
          size: typeof size === "number" ? size : null,
          description: description || null,
          agencyId,
          uploadedById: userId || null,
          projectId: projectId || null,
          taskId: taskId || null,
        },
      });

      return NextResponse.json(
        {
          message: "Attachment registered successfully",
          attachment,
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("[CREATE_ATTACHMENT_ERROR]", error);
      return NextResponse.json({ error: "Failed to create attachment" }, { status: 500 });
    }
  }
);