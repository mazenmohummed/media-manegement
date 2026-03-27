import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  // Security: Only allow Mazen (Superadmin)
  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const agencies = await prisma.agency.findMany({
    include: {
      _count: {
        select: { users: true, projects: true }
      },
      subscription: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(agencies);
}