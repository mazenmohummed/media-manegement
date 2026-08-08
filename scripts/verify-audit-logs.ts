// scripts/verify-audit-logs.ts
import { db } from "@/lib/db";

async function verifyAuditLogs() {
  console.log("--- Starting Audit Entry Check ---");

  // Fetch recent audit logs
  const latestLogs = await db.auditLog.findMany({
    take: 10,
    orderBy: { timestamp: "desc" },
  });

  if (latestLogs.length === 0) {
    console.error("❌ Failed: No records found in AuditLog table.");
    process.exit(1);
  }

  console.log(`Inspecting ${latestLogs.length} recent AuditLog entries...\n`);

  let hasErrors = false;

  // Allowed system & CRUD audit actions
  const validActions = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "PASSWORD_RESET",
  ];

  for (const log of latestLogs) {
    console.log(`AuditLog ID: ${log.id}`);

    // 1. Action Check
    if (validActions.includes(log.action)) {
      console.log(`  ✓ action: ${log.action}`);
    } else {
      console.error(`  ❌ Invalid action: ${log.action}`);
      hasErrors = true;
    }

    // 2. Entity Check
    if (log.entityType && log.entityId) {
      console.log(`  ✓ entityType: ${log.entityType} | entityId: ${log.entityId}`);
    } else {
      console.error(`  ❌ Missing entityType or entityId`);
      hasErrors = true;
    }

    // 3. Agency Context Check
    if (log.agencyId) {
      console.log(`  ✓ agencyId: ${log.agencyId}`);
    } else {
      console.error(`  ❌ Missing agencyId`);
      hasErrors = true;
    }

    // 4. Request Metadata Details
    console.log(`  - actorId: ${log.actorId ?? "N/A"}`);
    console.log(`  - ipAddress: ${log.ipAddress ?? "N/A"}`);
    console.log(`  - userAgent: ${log.userAgent ?? "N/A"}`);
    console.log(`  - timestamp: ${log.timestamp}`);

    console.log("-----------------------------------");
  }

  if (hasErrors) {
    console.error("\n❌ Audit Entry Check FAILED: Missing or malformed audit details.");
    process.exit(1);
  } else {
    console.log("\n✅ Audit Entry Check PASSED.");
  }
}

verifyAuditLogs()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });