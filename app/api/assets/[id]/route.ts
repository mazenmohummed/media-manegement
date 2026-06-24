import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// =========================================================
// GET: FETCH A SINGLE ASSET WITH CROSS-REFERENCED TASKS
// =========================================================
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = params;

    // 1. Fetch the targeted asset
    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset || asset.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // 2. Fetch related tasks bypassing loose relation bindings manually via has filters
    const relatedTasks = await prisma.task.findMany({
      where: {
        agencyId: session.user.agencyId,
        OR: [
          { assetIds: { has: id } },
          { id: { in: asset.taskIds || [] } }
        ]
      },
      select: {
        id: true,
        taskNo: true,
        taskType: true,
        startDate: true,
        endDate: true,
        taskNetProfit: true,
        status: true,
      },
    });

    return NextResponse.json({
      ...asset,
      tasks: relatedTasks,
    });
  } catch (error) {
    console.error("Asset Detail Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// =========================================================
// PUT: MODIFY CONFIGURATIONS & VALUATION METRICS
// =========================================================
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { assetName, category, purchasePrice, availabilityStatus } = body;

    // Verify ownership before updating
    const existingAsset = await prisma.asset.findUnique({ where: { id } });
    if (!existingAsset || existingAsset.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Asset unauthorized or missing" }, { status: 404 });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        assetName: assetName ?? undefined,
        category: category ?? undefined,
        currentValue: purchasePrice ? parseFloat(purchasePrice) : undefined,
        availabilityStatus: availabilityStatus ?? undefined,
      },
    });

    return NextResponse.json(updatedAsset, { status: 200 });
  } catch (error) {
    console.error("Asset Configuration Update Error:", error);
    return NextResponse.json({ error: "Failed to update configurations" }, { status: 500 });
  }
}

// =========================================================
// DELETE: PURGE EQUIPMENT FROM FLEET REGISTRY
// =========================================================
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = params;

    // Verify tenant ownership
    const existingAsset = await prisma.asset.findUnique({ where: { id } });
    if (!existingAsset || existingAsset.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Asset unauthorized or missing" }, { status: 404 });
    }

    // Database safe unlinking & removal block
    await prisma.$transaction(async (tx) => {
      // 1. Unlink this asset ID from any tasks referencing it in their MongoDB scalar arrays
      const tasksWithAsset = await tx.task.findMany({
        where: { assetIds: { has: id } }
      });

      for (const task of tasksWithAsset) {
        const updatedAssetIds = task.assetIds.filter((aid) => aid !== id);
        await tx.task.update({
          where: { id: task.id },
          data: { assetIds: updatedAssetIds }
        });
      }

      // 2. Perform target removal operations
      await tx.asset.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Asset successfully purged from fleet tracker" }, { status: 200 });
  } catch (error) {
    console.error("Asset Destruction Action Error:", error);
    return NextResponse.json({ error: "Failed to delete equipment item mapping" }, { status: 500 });
  }
}