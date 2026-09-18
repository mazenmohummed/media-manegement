// app/api/quotations/[qoutationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// ─── GET single quotation ───────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qoutationId: string }> } // ✅ Promise + correct name
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qoutationId } = await params; // ✅ await

    const quotation = await prisma.quotation.findFirst({
      where: {
        id: qoutationId,
        agencyId: session.user.agencyId, // ✅ scope to agency
      },
      include: {
        vendor: true,
        project: true,
        task: true,
        // ✅ Removed `purchaseOrder` — the relation is named `purchaseOrders` (array) in your schema
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(quotation, { status: 200 });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update quotation details or status ──────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ qoutationId: string }> } // ✅ Promise only
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qoutationId } = await params; // ✅ await
    const agencyId = session.user.agencyId;
    const body = await request.json();

    const {
      quotationNo,
      description,
      amount,
      currency,
      status,
      validUntil,
      notes,
    } = body;

    // ✅ Verify the quotation belongs to this agency
    const existing = await prisma.quotation.findFirst({
      where: { id: qoutationId, agencyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.quotation.update({
      where: { id: qoutationId },
      data: {
        ...(quotationNo !== undefined ? { quotationNo } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(validUntil !== undefined
          ? { validUntil: validUntil ? new Date(validUntil) : null }
          : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { vendor: true, project: true, task: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error updating quotation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove quotation ───────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ qoutationId: string }> } // ✅ Promise + correct name
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qoutationId } = await params; // ✅ await

    // ✅ Verify ownership before deleting
    const existing = await prisma.quotation.findFirst({
      where: {
        id: qoutationId,
        agencyId: session.user.agencyId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    await prisma.quotation.delete({
      where: { id: qoutationId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}