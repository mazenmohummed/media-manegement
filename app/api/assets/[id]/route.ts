import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// EDIT ASSET
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } // Type it as a Promise
) {
  try {
    // 1. UNWRAP the params
    const { id } = await params; 
    
    const body = await req.json();
    
    const updated = await prisma.asset.update({
      where: { id: id }, // Use the unwrapped id
      data: {
        assetName: body.assetName,
        category: body.category,
        currentValue: parseFloat(body.currentValue),
        availabilityStatus: body.availabilityStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// DELETE ASSET (Apply the same logic here)
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // 1. UNWRAP
    
    await prisma.asset.delete({ 
      where: { id: id } 
    });
    
    return NextResponse.json({ message: "Asset deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}