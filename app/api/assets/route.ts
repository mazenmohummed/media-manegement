import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Fetch assets for the agency
    const assets = await prisma.asset.findMany({
      where: {
        agencyId: session.user.agencyId
      }
    });

    // 2. Fetch all tasks for the agency to guarantee clean cross-referencing
    const allTasks = await prisma.task.findMany({
      where: {
        agencyId: session.user.agencyId
      },
      select: {
        id: true,
        taskNo: true,
        taskType: true,
        startDate: true,
        endDate: true,
        taskNetProfit: true,
        status: true,
        assetIds: true // Needed for structural mapping below
      }
    });

    // 3. Manually map tasks to assets if either side holds the relational ID reference array
    const assetsWithTasks = assets.map(asset => {
      const relatedTasks = allTasks.filter(task => 
        (asset.taskIds && asset.taskIds.includes(task.id)) || 
        (task.assetIds && task.assetIds.includes(asset.id))
      );

      return {
        ...asset,
        tasks: relatedTasks
      };
    });

    const totalInvestment = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
    
    return NextResponse.json({
      assets: assetsWithTasks,
      metrics: {
        totalInvestment,
        currentValue: totalInvestment,
        depreciation: 0
      }
    });
  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assetName, category, purchasePrice, purchaseDate, availabilityStatus, agencyId } = body;

    const newAsset = await prisma.asset.create({
      data: {
        assetName,
        category,
        purchaseDate: new Date(purchaseDate),
        currentValue: parseFloat(purchasePrice),
        availabilityStatus: availabilityStatus || "Available",
        agencyId,
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error("Creation Error:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}