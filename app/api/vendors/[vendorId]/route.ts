import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Params {
  params: Promise<{
    vendorId: string;
  }>;
}

// GET: Fetch a single vendor by ID with relations including category relation
export async function GET(request: Request, { params }: Params) {
  try {
    const { vendorId } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        agency: true,
        address: true,
        category: true,
        plannedExpenses: {
          include: { project: true },
        },
        expenses: {
          include: { project: true },
        },
        quotations: {
          include: { project: true, task: true },
        },
        purchaseOrders: {
          include: { items: true, project: true },
        },
        performanceReviews: {
          include: { project: true },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json(vendor, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH: Update vendor details, relation to categoryId, and optional nested address
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { vendorId } = await params;
    const body = await request.json();
    const { name, email, phoneNumber, status, categoryId, taxNumber, notes, paymentTerms, address } = body;

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name,
        email,
        phoneNumber,
        status,
        categoryId: categoryId || null,
        taxNumber,
        notes,
        paymentTerms,
        address: address
          ? {
              upsert: {
                create: {
                  line1: address.line1,
                  line2: address.line2,
                  city: address.city,
                  state: address.state,
                  postalCode: address.postalCode,
                  country: address.country,
                },
                update: {
                  line1: address.line1,
                  line2: address.line2,
                  city: address.city,
                  state: address.state,
                  postalCode: address.postalCode,
                  country: address.country,
                },
              },
            }
          : undefined,
      },
      include: {
        address: true,
        category: true,
      },
    });

    return NextResponse.json(updatedVendor, { status: 200 });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a vendor
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { vendorId } = await params;

    await prisma.vendor.delete({
      where: { id: vendorId },
    });

    return NextResponse.json({ message: 'Vendor deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Internal Server Error or Foreign Key Constraint Violation' },
      { status: 500 }
    );
  }
}