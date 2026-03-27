import { db } from "../lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = "mazn39998@gmail.com"; 
  const password = "Mm55Zz55Nn@gamil.";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log("🚀 Starting System Initialization in Hurghada...");

  try {
    // 1. Create the 'Master Agency' so the schema requirements are met
    const systemAgency = await db.agency.upsert({
      where: { email: "system@management.com" },
      update: {},
      create: {
        agencyName: "GLOBAL COMMAND CENTER",
        email: "system@management.com",
        operatorName: "Mazen",
        address: "Hurghada, Red Sea",
      },
    });

    console.log(`🏢 System Agency Verified: ${systemAgency.id}`);

    // 2. Create/Update the Superadmin User linked to that agency
    const admin = await db.user.upsert({
      where: { email },
      update: {
        role: "SUPERADMIN",
        agencyId: systemAgency.id, // Link to the agency we just verified
      },
      create: {
        email,
        name: "Mazen",
        password: hashedPassword,
        role: "SUPERADMIN",
        userType: "FULL_TIME",
        agencyId: systemAgency.id, // This satisfies the 'required' error
      },
    });

    console.log(`✅ Success! Superadmin created and linked: ${admin.email}`);
  } catch (error) {
    console.error("❌ Critical Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();