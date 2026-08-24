import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { TemplateType } from "@prisma/client";

// GET: List templates for agency
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as TemplateType | null;

    const templates = await db.projectTemplate.findMany({
      where: {
        agencyId: session.user.agencyId,
        ...(type && { type }),
      },
      include: {
        items: { orderBy: { order: "asc" } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(templates, { status: 200 });
  } catch (error: any) {
    console.error("[TEMPLATES_LIST_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST: Create template with items
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const body = await request.json();
    const { name, description, serviceType, type, items } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    const template = await db.projectTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        serviceType: serviceType?.trim() || null,
        type: type || TemplateType.PROJECT,
        agencyId,
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

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error("[TEMPLATE_CREATE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create template" },
      { status: 500 }
    );
  }
}