// jobs/archive-old-projects.ts
import { prisma } from '@/lib/prisma';
import { getArchiveService } from '@/lib/storage';

export async function archiveOldProjectsJob() {
  console.log('🔄 Starting archive job...');

  try {
    const archiveService = getArchiveService();

    const agencies = await prisma.agency.findMany({
      where: {
        syncEnabled: true,
        storageStrategy: {
          in: ['HYBRID', 'CLOUD_ONLY'],
        },
      },
      select: {
        id: true,
        agencyName: true,
        syncEnabled: true,
      },
    });

    if (agencies.length === 0) {
      console.log('ℹ️ No agencies with sync enabled found');
      return { archived: 0, agencies: 0 };
    }

    console.log(`📋 Found ${agencies.length} agencies to process`);

    const results = {
      totalAgencies: agencies.length,
      totalArchived: 0,
      success: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const agency of agencies) {
      try {
        console.log(`📦 Processing agency: ${agency.agencyName} (${agency.id})`);

        const result = await archiveService.archiveOldProjects(agency.id);

        // ✅ `versionsArchived` matches the updated ArchiveService return type
        results.totalArchived += result.versionsArchived || 0;
        results.success++;
        results.details.push({
          agencyId: agency.id,
          agencyName: agency.agencyName,
          versionsArchived: result.versionsArchived || 0,
          projectsArchived: result.projectsArchived || 0,
          status: 'success',
        });

        console.log(
          `✅ Archived ${result.versionsArchived || 0} files for ${agency.agencyName}`
        );
      } catch (error) {
        results.failed++;
        results.details.push({
          agencyId: agency.id,
          agencyName: agency.agencyName,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        console.error(`❌ Failed to archive for agency ${agency.id}:`, error);
      }
    }

    console.log(
      `📊 Archive job completed: ${results.success} succeeded, ${results.failed} failed`
    );
    console.log(`📁 Total files archived: ${results.totalArchived}`);

    return results;
  } catch (error) {
    console.error('❌ Archive job failed:', error);
    throw error;
  }
}

// Run daily at 2 AM
export const schedule = '0 2 * * *';