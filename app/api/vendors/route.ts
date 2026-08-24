import { NextResponse } from 'next/server';
import { VendorStatus } from '@prisma/client';
import { db } from '@/lib/db';

// GET /api/vendors?agencyId=...&categoryId=...&status=...&search=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as VendorStatus | null;
    const search = searchParams.get('search');

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId is required' }, { status: 400 });
    }

    const vendors = await db.vendor.findMany({
      where: {
        agencyId,
        ...(categoryId && { categoryId }),
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { vendorNo: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        address: true,
        category: true, // Include the relation to get category details
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(vendors, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/vendors
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      agencyId, 
      name, 
      categoryName, // Custom text if creating a new category on the fly
      categoryId,   // Existing category ID if selected from dropdown
      status, 
      paymentTerms, 
      taxNumber, 
      email, 
      phoneNumber, 
      notes, 
      address 
    } = body;

    // Validation
    if (!agencyId || !name) {
      return NextResponse.json({ error: 'agencyId and name are required' }, { status: 400 });
    }

    let finalCategoryId = categoryId || null;

    // If the user entered a new category name manually instead of selecting an ID, create it first
    if (!finalCategoryId && categoryName && categoryName.trim() !== '') {
      const trimmedName = categoryName.trim();
      
      // Check if it already exists to avoid unique constraint crashes
      let existingCat = await db.vendorCategory.findFirst({
        where: { agencyId, name: { equals: trimmedName, mode: 'insensitive' } }
      });

      if (!existingCat) {
        existingCat = await db.vendorCategory.create({
          data: {
            agencyId,
            name: trimmedName,
          }
        });
      }
      finalCategoryId = existingCat.id;
    }

    // Create the vendor using categoryId relation
    const newVendor = await db.vendor.create({
      data: {
        agencyId,
        name,
        categoryId: finalCategoryId,
        status: status || VendorStatus.ACTIVE,
        paymentTerms: paymentTerms || 'COD',
        taxNumber,
        email,
        phoneNumber,
        notes,
        address: address && Object.keys(address).length > 0 
          ? { create: address } 
          : undefined,
      },
      include: {
        address: true,
        category: true,
      },
    });

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}