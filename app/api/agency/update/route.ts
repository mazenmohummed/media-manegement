import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agencyId = session.user.agencyId as string;
    const body = await req.json();

    const {
      agencyName, operatorName, email,
      address, latitude, longitude, radius, workingHours,
    } = body;

    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: {
        ...(agencyName   !== undefined && { agencyName }),
        ...(operatorName !== undefined && { operatorName }),
        ...(email        !== undefined && { email }),
        ...(address      !== undefined && { address }),
        ...(latitude     !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude    !== undefined && { longitude: parseFloat(longitude) }),
        ...(radius       !== undefined && { radius: parseInt(radius) }),
        ...(workingHours !== undefined && { workingHours }),
      },
    });

    return NextResponse.json({ success: true, agency: updated });
  } catch (error) {
    console.error("[AGENCY_UPDATE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}