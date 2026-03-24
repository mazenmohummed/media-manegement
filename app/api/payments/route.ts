import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, method, datePaid, clientId, agencyId } = body;

    // 1. Generate the sequence number
    const paymentCount = await prisma.payment.count({
      where: { agencyId }
    });
    const nextPaymentNo = `PAY-${1000 + paymentCount + 1}`;

    // 2. Create the record
    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        method: method,
        datePaid: new Date(datePaid),
        paymentNo: nextPaymentNo,
        // Assign the IDs directly to the fields defined in your schema
        clientId: clientId, 
        agencyId: agencyId, 
      },
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error("Payment Creation Error:", error);
    // If it's a P2025 error, let's make the response clearer
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: "Agency or Client record not found. Please check the IDs." 
      }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}