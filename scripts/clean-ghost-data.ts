import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanGhostUsers() {
  console.log("--- Starting Ghost Data Cleanup ---");

  // 1. Get all users
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, agencyId: true }
  });

  console.log(`Checking ${allUsers.length} users...`);

  const orphans = [];

  for (const user of allUsers) {
    // 2. Try to find the associated agency
    const agency = await prisma.agency.findUnique({
      where: { id: user.agencyId }
    });

    // 3. If no agency is found, it's a "Ghost" record
    if (!agency) {
      console.warn(`[GHOST FOUND] User: ${user.email} | ID: ${user.id} | Missing AgencyID: ${user.agencyId}`);
      orphans.push(user.id);
    }
  }

  if (orphans.length > 0) {
    console.log(`Found ${orphans.length} orphan users. Deleting...`);
    
    // 4. Delete the orphans to restore database integrity
    const deleteResult = await prisma.user.deleteMany({
      where: {
        id: { in: orphans }
      }
    });

    console.log(`Successfully deleted ${deleteResult.count} ghost records.`);
  } else {
    console.log("No ghost data found. Your database is healthy!");
  }
}

cleanGhostUsers()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());