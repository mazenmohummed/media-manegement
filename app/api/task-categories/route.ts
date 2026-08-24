import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

export const GET = withAuthGuard("taskCategory:read", async (req, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);
    const { searchParams } = new URL(req.url);
    const withDept = searchParams.get("withDepartment") === "true";

    const categories = await db.taskCategory.findMany({
      where: { agencyId },
      include: withDept
        ? { department: { select: { id: true, name: true } } }
        : undefined,
      orderBy: { name: "asc" },
    });

    // ← WRAP IN OBJECT so frontend can read data.categories
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    console.error("[TASK_CATEGORIES_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
});

export const POST = withAuthGuard("taskCategory:create", async (req, { agencyId }) => {
  try {
    const body = await req.json();
    const { name, description, departmentId } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const db = getScopedPrisma(agencyId);

    const category = await db.taskCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        agencyId,
        departmentId: departmentId || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A category with this name already exists in your agency" },
        { status: 409 }
      );
    }
    console.error("[TASK_CATEGORIES_POST_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create category" },
      { status: 500 }
    );
  }
});