// app/api/production/gate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { checkConceptApproval } from '@/lib/approval-gate';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conceptId, action } = body;

    if (!conceptId) {
      return NextResponse.json(
        { error: 'Concept ID is required' },
        { status: 400 }
      );
    }

    const result = await checkConceptApproval(conceptId);

    return NextResponse.json({
      canProceed: result.canProceed,
      errors: result.errors,
      warnings: result.warnings,
      message: result.canProceed
        ? 'Concept is approved and ready for production'
        : 'Concept is not fully approved. Please address all errors before proceeding.',
    });
  } catch (error) {
    console.error('Error checking approval gate:', error);
    return NextResponse.json(
      { error: 'Failed to check approval status' },
      { status: 500 }
    );
  }
}