// server/cron.ts
import cron from 'node-cron';
import { syncAgencyFilesJob } from '@/jobs/sync-agency-files';
import { archiveOldProjectsJob } from '@/jobs/archive-old-projects';

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('🔄 Running file sync...');
  await syncAgencyFilesJob();
});

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🗄️ Running archive...');
  await archiveOldProjectsJob();
});

console.log('✅ Cron jobs scheduled');