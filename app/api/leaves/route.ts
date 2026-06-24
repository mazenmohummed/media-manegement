import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const agencyId = session.user.agencyId;

  try {
    // Pull users under this agency and select only their layout profile metadata and leaves array
    const usersWithLeaves = await prisma.user.findMany({
      where: { agencyId },
      select: {
        id: true,
        name: true,
        leaves: true,
      },
    });

    return NextResponse.json(usersWithLeaves);
  } catch (error) {
    console.error("FETCH_USERS_LEAVES_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporate leave registry logs" },
      { status: 500 }
    );
  }
}