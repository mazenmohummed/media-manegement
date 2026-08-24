import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

// GET: Single template
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;

    const template = await db.projectTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: { orderBy: { order: "asc" } },
      },
    });

    if (!template || template.agencyId !== session.user.agencyId) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template, { status: 200 });
  } catch (error: any) {
    console.error("[TEMPLATE_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Error" },
      { status: 500 }
    );
  }
}

// PATCH: Update template + sync items
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;
    const body = await request.json();
    const { name, description, serviceType, type, items } = body;

    const existing = await db.projectTemplate.findUnique({
      where: { id: templateId },
      include: { items: true },
    });

    if (!existing || existing.agencyId !== session.user.agencyId) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Delete existing items and recreate
    const updated = await db.$transaction(async (tx) => {
      await tx.projectTemplateItem.deleteMany({
        where: { templateId },
      });

      return tx.projectTemplate.update({
        where: { id: templateId },
        data: {
          name: name?.trim(),
          description: description?.trim() || null,
          serviceType: serviceType?.trim() || null,
          type,
          items: {
            create:
              items?.map((item: any, index: number) => ({
                milestoneName: item.milestoneName?.trim() || "",
                taskTitle: item.taskTitle?.trim() || "",
                taskType: item.taskType?.trim() || "",
                description: item.description?.trim() || null,
                estimatedHours: item.estimatedHours || 0,
                order: index,
                categoryId: item.categoryId || null,
              })) || [],
          },
        },
        include: { items: { orderBy: { order: "asc" } } },
      });
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("[TEMPLATE_PATCH_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE: Remove template
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;

    const existing = await db.projectTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing || existing.agencyId !== session.user.agencyId) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    await db.projectTemplate.delete({ where: { id: templateId } });

    return NextResponse.json(
      { message: "Template deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[TEMPLATE_DELETE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Error" },
      { status: 500 }
    );
  }
}