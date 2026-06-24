import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      agencyName, 
      agencyEmail, 
      operatorName, 
      operatorEmail, 
      password, 
      plan = "FREE" 
    } = body;

    // 1. PRE-DEPLOYMENT CHECKS (Check for existing entities)
    // Run these outside the transaction to keep the transaction lifecycle short
    const [existingUser, existingAgency] = await Promise.all([
      prisma.user.findUnique({ where: { email: operatorEmail } }),
      prisma.agency.findUnique({ where: { email: agencyEmail } })
    ]);

    if (existingUser || existingAgency) {
      return NextResponse.json({ 
        error: "Conflict: Email or Agency already registered." 
      }, { status: 400 });
    }

    // 2. DATA PREPARATION
    // Moving bcrypt hashing here is CRITICAL because it's CPU intensive and slow
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedAgencyNo = `MAG-${randomSuffix}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const planConfig = {
      FREE: { maxUsers: 5, maxProjects: 50, hasAssetAccess: false, geo: false },
      PRO: { maxUsers: 20, maxProjects: 200, hasAssetAccess: true, geo: true },
      UNLIMITED: { maxUsers: 9999, maxProjects: 9999, hasAssetAccess: true, geo: true },
    };
    
    const selectedPlan = planConfig[plan as keyof typeof planConfig] || planConfig.FREE;

    // 3. ATOMIC DEPLOYMENT
    // Increased timeout to 20s to account for latency (especially important for MongoDB Atlas)
    const result = await prisma.$transaction(async (tx) => {
      // Create Agency and Subscription together
      const newAgency = await tx.agency.create({
        data: {
          agencyNo: generatedAgencyNo,
          agencyName,
          email: agencyEmail,
          subscription: {
            create: {
              plan: plan as any,
              status: plan === "FREE" ? "ACTIVE" : "TRIALING",
              maxUsers: selectedPlan.maxUsers,
              maxProjects: selectedPlan.maxProjects,
              hasAssetAccess: selectedPlan.hasAssetAccess,
              geoFencingEnabled: selectedPlan.geo,
            }
          }
        }
      });

      // Create Admin User linked to the new Agency
      const adminUser = await tx.user.create({
        data: {
          userNo: `USR-${randomSuffix}`,
          name: operatorName,
          email: operatorEmail,
          password: hashedPassword,
          role: "ADMIN",
          userType: "FULL_TIME",
          agencyId: newAgency.id,
        }
      });

      return { agency: newAgency, user: adminUser };
    }, {
      maxWait: 5000, // Time to wait for a connection from the pool
      timeout: 20000 // Time allowed for the transaction to execute (20 seconds)
    });

    return NextResponse.json({
      message: "Infrastructure deployed successfully",
      ...result
    }, { status: 201 });

  } catch (error: any) {
    console.error("DEPLOYMENT_FATAL", error);

    // Specific Handling for Transaction Timeouts (P2028)
    if (error.code === 'P2028') {
      return NextResponse.json({ 
        error: "Transaction Expired", 
        details: "The database operation took too long. Please try again or check your connection latency." 
      }, { status: 504 });
    }

    // Handle Prisma-specific connection errors
    if (error.code === 'P2010' || error.message.includes('timeout')) {
      return NextResponse.json({ 
        error: "Database connection timed out.", 
        details: "Verify MongoDB Atlas Network Access (IP Whitelist) for your current location." 
      }, { status: 503 });
    }

    // Handle Unique Constraint (already exists)
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: "Unique Constraint Collision", 
        details: `The field ${error.meta?.target || 'unknown'} is already in use.` 
      }, { status: 409 });
    }

    return NextResponse.json({ 
      error: "Infrastructure Deployment Failed", 
      details: error.message 
    }, { status: 500 });
  }
}