import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. SECURITY: Ensure the user belongs to an agency
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized: No Agency Context" }, { status: 401 });
    }

    const { amount, method, datePaid, clientId, description } = await req.json();
    const agencyId = session.user.agencyId;

    // 2. SUBSCRIPTION CHECK (Tier Enforcement)
    // We fetch the agency to check their current plan limits
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { 
        subscription: true,
        _count: { select: { payments: true } } 
      }
    });

    // Example logic: If you decide to limit monthly transactions for Free users
    if (agency?.subscription?.plan === "FREE" && agency._count.payments >= 500) {
       return NextResponse.json({ error: "Monthly payment record limit reached for Free Tier." }, { status: 403 });
    }

    // 3. GENERATE SEQUENCE NUMBER (PAY-1001, etc.)
    const paymentCount = await prisma.payment.count({
      where: { agencyId }
    });
    const nextPaymentNo = `PAY-${1000 + paymentCount + 1}`;

    // 4. ATOMIC RECORD CREATION
    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        method: method,
        datePaid: new Date(datePaid),
        paymentNo: nextPaymentNo,
        description: description || "",
        clientId: clientId, 
        agencyId: agencyId, // Strict enforcement from session
      },
    });

    return NextResponse.json(payment);

  } catch (error: any) {
    console.error("Payment Creation Error:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: "Referenced Client record not found." 
      }, { status: 404 });
    }
    
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}