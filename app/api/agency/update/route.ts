import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, agencyId: true }
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse the body once
    const body = await req.json();
    const { 
      agencyName, 
      email,
      address, 
      latitude, 
      longitude, 
      radius, 
      plan, 
      workingHours 
    } = body;

    const updatedAgency = await prisma.agency.update({
      where: { id: user.agencyId },
      data: {
        agencyName,
        email,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radius: radius ? parseInt(radius) : 100,
        
        // Since workingHours is a list of 'type WorkingDay', 
        // we overwrite the entire array with the new data.
        workingHours: {
          set: workingHours.map((wh: any) => ({
            day: wh.day,
            openTime: wh.openTime,
            closeTime: wh.closeTime,
            isClosed: wh.isClosed
          }))
        },

        // Nested update for the subscription plan
        subscription: {
          upsert: {
            create: { plan: plan || "FREE" },
            update: { plan: plan }
          }
        }
      }
    });

    return NextResponse.json(updatedAgency);
  } catch (error: any) {
    console.error("AGENCY_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}