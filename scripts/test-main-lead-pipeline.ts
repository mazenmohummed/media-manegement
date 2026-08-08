import { db } from "@/lib/db";

async function testMainLeadPipeline() {
  console.log("--- Starting Main CRM Lead Pipeline Verification ---");

  const agency = await db.agency.findFirst();
  const owner = await db.user.findFirst();

  if (!agency) throw new Error("No agency found to bind lead.");

  // 1. CREATE Lead
  const lead = await db.lead.create({
    data: {
      leadNo: `LEAD-${Date.now()}`,
      companyName: "Acme Enterprises",
      contactName: "John Doe",
      contactEmail: "john@acme.com",
      industry: "Software",
      estimatedBudget: 50000,
      currency: "EGP",
      source: "WEBSITE",
      status: "NEW",
      agencyId: agency.id,
      ...(owner ? { ownerId: owner.id } : {}),
    },
  });
  console.log("✓ LEAD CREATED:", lead.id, `| Lead No: ${lead.leadNo}`);

  // 2. TRANSITION STATUS Pipeline
  const statusTransitions = ["CONTACTED", "QUALIFIED", "CONVERTED"] as const;

  for (const status of statusTransitions) {
    const updated = await db.lead.update({
      where: { id: lead.id },
      data: { status },
    });
    console.log(`✓ STATUS TRANSITIONED TO: ${updated.status}`);
  }

  // 3. SOFT DELETE
  await db.lead.update({
    where: { id: lead.id },
    data: { deletedAt: new Date() },
  });
  console.log("✓ LEAD SOFT DELETED");

  console.log("--- Verification Complete ---");
}

testMainLeadPipeline().catch(console.error);