import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 

export async function GET() {
  try {
    const assets = await prisma.asset.findMany(); // Get everything without filters first

    const totalInvestment = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
    
    return NextResponse.json({
      assets,
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
        currentValue: parseFloat(purchasePrice), // Initializing current value as purchase price
        availabilityStatus: availabilityStatus || "Available",
        agencyId, // Ensure you pass the active agency ID
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error("Creation Error:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}