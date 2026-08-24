import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ quotationId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotationId } = await params;

    const quotation = await db.quotation.findUnique({
      where: { id: quotationId },
      include: {
        vendor: true,
        project: true,
        purchaseOrder: true,
      },
    });

    if (!quotation || quotation.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("[QUOTATION_GET_BY_ID]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotationId } = await params;
    const body = await req.json();

    const existing = await db.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!existing || existing.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.quotation.update({
      where: { id: quotationId },
      data: {
        quotationNo: body.quotationNo,
        description: body.description,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        currency: body.currency,
        status: body.status,
        validUntil: body.validUntil ? new Date(body.validUntil) : body.validUntil,
        notes: body.notes,
        vendorId: body.vendorId,
        projectId: body.projectId !== undefined ? body.projectId : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[QUOTATION_PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotationId } = await params;

    const existing = await db.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!existing || existing.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.quotation.delete({
      where: { id: quotationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[QUOTATION_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}