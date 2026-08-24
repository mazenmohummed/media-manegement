import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET single quotation
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: { vendor: true, project: true, task: true, purchaseOrder: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json(quotation, { status: 200 });
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Update quotation details or status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ qoutationId: string }> | { qoutationId: string } }
) {
  try {
    const resolvedParams = await params;
    const quotationId = resolvedParams.qoutationId;
    const body = await request.json();
    const { quotationNo, description, amount, currency, status, validUntil, notes } = body;

    const updated = await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        ...(quotationNo !== undefined ? { quotationNo } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { vendor: true, project: true, task: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating quotation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Apply the exact same change to GET and DELETE route handlers:
// const resolvedParams = await params;
// const id = resolvedParams.qoutationId;

// DELETE: Remove quotation
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.quotation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}