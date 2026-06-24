import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Fetches all users along with their embedded leaves data array
    const usersWithLeaves = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        leaves: true,
      },
    });

    return NextResponse.json(usersWithLeaves, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch leaves structural array data", details: error.message },
      { status: 500 }
    );
  }
}