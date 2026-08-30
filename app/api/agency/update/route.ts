// app/api/agency/update/route.ts
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

    // ✅ Build the update data
    const updateData: any = {};

    if (agencyName !== undefined) updateData.agencyName = agencyName;
    if (operatorName !== undefined) updateData.operatorName = operatorName;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (radius !== undefined) updateData.radius = parseInt(radius);

    // ✅ Handle workingHours separately - delete existing and create new
    if (workingHours !== undefined && Array.isArray(workingHours)) {
      // Delete existing working hours
      await prisma.workingDay.deleteMany({
        where: { agencyId },
      });

      // Create new working hours
      await prisma.workingDay.createMany({
        data: workingHours.map((wh: any) => ({
          day: wh.day,
          openTime: wh.openTime,
          closeTime: wh.closeTime,
          isClosed: wh.isClosed ?? false,
          agencyId,
        })),
      });
    }

    // ✅ Update the agency
    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: updateData,
      include: {
        workingHours: true,
        subscription: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      agency: updated,
      workingHours: updated.workingHours,
    });
  } catch (error) {
    console.error("[AGENCY_UPDATE]", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 });
  }
}