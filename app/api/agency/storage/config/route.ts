// app/api/agency/storage/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAgencyStorageManager } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agencyId, config } = body;
    
    if (!agencyId) {
      return NextResponse.json(
        { error: 'agencyId is required' },
        { status: 400 }
      );
    }

    const storageManager = getAgencyStorageManager();
    
    await storageManager.setupAgencyStorage(agencyId, {
      storageType: config?.storageType || 'LOCAL_NAS',
      networkPath: config?.networkPath,
      credentials: config?.credentials
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error setting up agency storage:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get('agencyId');
    
    if (!agencyId) {
      return NextResponse.json(
        { error: 'agencyId is required' },
        { status: 400 }
      );
    }

    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        storageStrategy: true,
        localStoragePath: true,
        localBaseUrl: true,
        syncEnabled: true,
        cloudStorageQuota: true,
        storageUsed: true
      }
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(agency);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error fetching agency storage config:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}