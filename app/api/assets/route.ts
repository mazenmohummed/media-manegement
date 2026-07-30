import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { AssetStatus } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Strictly rely on session agency ID to avoid unauthorized context leakage
  const agencyId = session?.user?.agencyId;

  if (!agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const assets = await prisma.asset.findMany({
      where: {
        agencyId,
        deletedAt: null,
      },
      include: {
        tasks: {
          select: {
            id: true,
            taskNo: true,
            taskType: true,
            startDate: true,
            endDate: true,
            taskNetProfit: true,
            status: true,
          },
        },
      },
    });

    const totalInvestment = assets.reduce(
      (sum, a) => sum + (Number(a.currentValue) || 0),
      0
    );

    return NextResponse.json({
      assets,
      metrics: {
        totalInvestment,
        currentValue: totalInvestment,
        depreciation: 0,
      },
    });
  } catch (error) {
    console.error("Prisma Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { assetName, category, purchasePrice, purchaseDate, availabilityStatus } = body;

    // Convert input casing to match AssetStatus Enum safely
    let formattedStatus: AssetStatus = AssetStatus.AVAILABLE;
    if (availabilityStatus) {
      const upper = availabilityStatus.toUpperCase();
      if (Object.values(AssetStatus).includes(upper as AssetStatus)) {
        formattedStatus = upper as AssetStatus;
      }
    }

    const newAsset = await prisma.asset.create({
      data: {
        assetName,
        category,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        currentValue: parseFloat(purchasePrice) || 0,
        availabilityStatus: formattedStatus,
        agencyId: session.user.agencyId, 
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error("Prisma Creation Error:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}