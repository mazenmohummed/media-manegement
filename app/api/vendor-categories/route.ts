import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId is required' }, { status: 400 });
    }

    const categories = await db.vendorCategory.findMany({
      where: { agencyId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ADD THIS POST HANDLER
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, agencyId } = body;

    if (!name || !agencyId) {
      return NextResponse.json(
        { error: 'Name and agencyId are required' },
        { status: 400 }
      );
    }

    const newCategory = await db.vendorCategory.create({
      data: {
        name,
        agencyId,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor category:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}