// app/api/creative-assets/check-duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const name = url.searchParams.get('name');
    const conceptId = url.searchParams.get('conceptId');

    if (!name || !conceptId) {
      return NextResponse.json(
        { error: 'Name and conceptId are required' },
        { status: 400 }
      );
    }

    // Find existing assets with the same name in this concept
    const existingAssets = await prisma.creativeAsset.findMany({
      where: {
        name: {
          startsWith: name,
        },
        conceptId: conceptId,
        deletedAt: null,
        agencyId: session.user.agencyId,
      },
      select: {
        name: true,
      },
      orderBy: {
        name: 'desc',
      },
    });

    const exactMatch = existingAssets.some(a => a.name === name);

    let suggestedName = name;
    if (exactMatch) {
      let highestNumber = 0;
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePattern = new RegExp(`^${escapedName}(?:\\s*\\((\\d+)\\))?$`);
      
      for (const asset of existingAssets) {
        const match = asset.name.match(namePattern);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          if (num > highestNumber) {
            highestNumber = num;
          }
        } else if (asset.name === name) {
          highestNumber = Math.max(highestNumber, 1);
        }
      }

      if (highestNumber >= 1) {
        suggestedName = `${name} (${highestNumber + 1})`;
      } else {
        suggestedName = `${name} (2)`;
      }
    }

    return NextResponse.json({
      exists: exactMatch,
      suggestedName: exactMatch ? suggestedName : null,
    });

  } catch (error) {
    console.error('Error checking duplicate name:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicate name' },
      { status: 500 }
    );
  }
}