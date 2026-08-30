import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: any = {
      agencyId: session.user.agencyId,
      deletedAt: null,
    };

    if (status) where.availabilityStatus = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { assetName: { contains: search, mode: "insensitive" } },
        { assetNo: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              taskNo: true,
            },
          },
        },
      }),
      db.asset.count({ where }),
    ]);

    return NextResponse.json({
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      assetName,
      category,
      purchaseDate,
      currentValue,
      availabilityStatus,
      serialNumber,
      location,
      maintenanceDueAt,
    } = body;

    if (!assetName || assetName.trim() === "") {
      return NextResponse.json(
        { error: "Asset name is required" },
        { status: 400 }
      );
    }

    if (!category || category.trim() === "") {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    // Generate asset number
    const assetCount = await db.asset.count({
      where: { agencyId: session.user.agencyId },
    });
    const assetNo = `AST-${String(assetCount + 1).padStart(5, "0")}`;

    const asset = await db.asset.create({
      data: {
        assetNo,
        assetName: assetName.trim(),
        category: category.trim(),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        currentValue: Number(currentValue) || 0,
        availabilityStatus: availabilityStatus || "AVAILABLE",
        serialNumber: serialNumber?.trim() || null,
        location: location?.trim() || null,
        maintenanceDueAt: maintenanceDueAt ? new Date(maintenanceDueAt) : null,
        agencyId: session.user.agencyId,
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            taskNo: true,
          },
        },
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Failed to create asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}