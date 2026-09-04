// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getHybridFileService } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const agencyId = formData.get('agencyId') as string;
    const conceptId = formData.get('conceptId') as string;
    const shareWithClient = formData.get('shareWithClient') === 'true';

    // ✅ Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: 'agencyId is required' },
        { status: 400 }
      );
    }

    if (!conceptId) {
      return NextResponse.json(
        { error: 'conceptId is required' },
        { status: 400 }
      );
    }

    // ✅ Get HybridFileService with dependencies
    const hybridFileService = getHybridFileService();
    
    // ✅ Upload file
    const result = await hybridFileService.uploadFile(
      Buffer.from(await file.arrayBuffer()),
      file.name,
      agencyId,
      conceptId,
      {
        syncToCloud: shareWithClient,
        shareWithClient: shareWithClient,
        isActive: true
      }
    );

    return NextResponse.json({
      success: true,
      versionId: result.version.id,
      fileUrl: result.accessUrl,
      storageType: result.storageType,
      synced: result.synced,
      message: 'File uploaded successfully'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}