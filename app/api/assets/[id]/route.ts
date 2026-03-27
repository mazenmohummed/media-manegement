import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// EDIT ASSET
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Security Check: Block if no agency is linked to the session
    if (!session?.user?.agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params; 
    const body = await req.json();
    
    // 2. The Multi-Tenant Update
    // We include agencyId in the 'where' clause to ensure the user 
    // ONLY updates an asset that belongs to their specific agency.
    const updated = await prisma.asset.update({
      where: { 
        id: id,
        agencyId: session.user.agencyId // <--- THE SECURITY WALL
      }, 
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

// DELETE ASSET
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    
    // 3. The Multi-Tenant Delete
    // Prisma will throw an error if the ID exists but the agencyId doesn't match,
    // protecting your data isolation.
    await prisma.asset.delete({ 
      where: { 
        id: id,
        agencyId: session.user.agencyId // <--- THE SECURITY WALL
      } 
    });
    
    return NextResponse.json({ message: "Asset deleted" });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}