import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;

    const asset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            taskNo: true,
            status: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Failed to fetch asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;
    const body = await req.json();

    const existingAsset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (body.assetName !== undefined) updateData.assetName = body.assetName.trim();
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.purchaseDate !== undefined)
      updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    if (body.currentValue !== undefined)
      updateData.currentValue = Number(body.currentValue) || 0;
    if (body.availabilityStatus !== undefined)
      updateData.availabilityStatus = body.availabilityStatus;
    if (body.serialNumber !== undefined)
      updateData.serialNumber = body.serialNumber?.trim() || null;
    if (body.location !== undefined)
      updateData.location = body.location?.trim() || null;
    if (body.maintenanceDueAt !== undefined)
      updateData.maintenanceDueAt = body.maintenanceDueAt
        ? new Date(body.maintenanceDueAt)
        : null;

    const asset = await db.asset.update({
      where: { id: assetId },
      data: updateData,
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

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Failed to update asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await params;

    const existingAsset = await db.asset.findFirst({
      where: {
        id: assetId,
        agencyId: session.user.agencyId,
        deletedAt: null,
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Soft delete
    await db.asset.update({
      where: { id: assetId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete asset:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}