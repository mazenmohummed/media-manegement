import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    // 1. SESSION & AGENCY WALL CHECK
    // Extracting agencyId from session to ensure the user only sees their own data
    const userAgencyId = session?.user?.agencyId;

    if (!userAgencyId) {
      return new NextResponse("Unauthorized: No Agency Context", { status: 401 });
    }

    if (!id || id === "undefined") {
      return new NextResponse("Invalid Payment ID", { status: 400 });
    }

    // 2. SECURE FETCH
    const payment = await prisma.payment.findUnique({
      where: { 
        id: id,
        // CRITICAL: Filter by agencyId so users can't access other agencies' records
        agencyId: userAgencyId 
      },
      include: {
        client: {
          select: {
            clientName: true,
            clientNo: true,
          }
        },
        // Optional: Include agency info for branding/headers on the payment detail page
        agency: {
          select: {
            agencyName: true,
            email: true,
          }
        }
      }
    });

    if (!payment) {
      return new NextResponse("Payment Not Found", { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error("PAYMENT_GET_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}