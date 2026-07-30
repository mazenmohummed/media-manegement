import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { AssetStatus } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Parse searchParams from request URL
  const { searchParams } = new URL(req.url);
  const queryAgencyId = searchParams.get("agencyId");

  // Use session agencyId first, fallback to query parameter
  const targetAgencyId = session?.user?.agencyId || queryAgencyId;

  if (!targetAgencyId) {
    return new NextResponse("Unauthorized or Missing Agency ID", { status: 401 });
  }

  try {

    console.log({
  sessionAgencyId: session?.user?.agencyId,
  queryAgencyId,
  targetAgencyId,
});

    const assets = await prisma.asset.findMany({
      where: {
        agencyId: targetAgencyId,
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

    console.log(assets);

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
        // Always attach the asset to the current user's session agency ID
        agencyId: session.user.agencyId, 
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error("Prisma Creation Error:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}