import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quotations = await db.quotation.findMany({
      where: { agencyId: session.user.agencyId },
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotations);
  } catch (error) {
    console.error("[QUOTATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { quotationNo, description, amount, currency, status, validUntil, notes, vendorId, projectId } = body;

    if (!vendorId || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields (vendorId, amount)" }, { status: 400 });
    }

    const quotation = await db.quotation.create({
      data: {
        quotationNo,
        description,
        amount: parseFloat(amount),
        currency: currency || "EGP",
        status: status || "REQUESTED",
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
        vendorId,
        projectId: projectId || null,
        agencyId: session.user.agencyId,
      },
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("[QUOTATIONS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}