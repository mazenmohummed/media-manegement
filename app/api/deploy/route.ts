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

    // 1. PRE-DEPLOYMENT CHECKS
    const [existingUser, existingAgency] = await Promise.all([
      prisma.user.findUnique({ where: { email: operatorEmail } }),
      prisma.agency.findUnique({ where: { email: agencyEmail } })
    ]);

    if (existingUser || existingAgency) {
      return NextResponse.json({ 
        error: "Conflict: Email or Agency already registered." 
      }, { status: 400 });
    }

    // 2. GENERATE IDENTIFIERS
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
    const result = await prisma.$transaction(async (tx) => {
      // 1. Prepare data
      const agencyData: any = {
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
      };

      // 2. CRITICAL SAFEGUARD: Remove keys that cause MongoDB unique null collisions
      delete agencyData.stripeCustomerId;
      if (agencyData.subscription?.create) {
        delete agencyData.subscription.create.stripeSubscriptionId;
      }

      const newAgency = await tx.agency.create({
        data: agencyData
      });

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

      return { newAgency, adminUser };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("DEPLOYMENT_FATAL", error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: "Unique Constraint Collision", 
        details: `Field ${error.meta?.target} already has a null or existing entry.` 
      }, { status: 409 });
    }

    return NextResponse.json({ 
      error: "Infrastructure Deployment Failed", 
      details: error.message 
    }, { status: 500 });
  }
}