import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      agencyName,
      agencyEmail,
      phoneNumber,
      field,
      timezone,
      defaultCurrency,
      address,
      plan = "FREE",
      operatorName,
      operatorEmail,
      password,
    } = body;

    // Validate minimum required fields
    if (!agencyName || !agencyEmail || !operatorEmail || !password) {
      return NextResponse.json(
        { error: "Missing required deployment fields.", details: "Agency name, email, operator email, and password are required." },
        { status: 400 }
      );
    }

    // Check if agency email already exists
    const existingAgency = await prisma.agency.findUnique({
      where: { email: agencyEmail.toLowerCase().trim() },
    });

    if (existingAgency) {
      return NextResponse.json(
        { error: "An agency with this email already exists." },
        { status: 409 }
      );
    }

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: operatorEmail.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // ✅ Create agency with all related data in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Agency
      const agency = await tx.agency.create({
        data: {
          agencyName: agencyName.trim(),
          email: agencyEmail.toLowerCase().trim(),
          phoneNumber: phoneNumber || null,
          field: field || null,
          timezone: timezone || "Africa/Cairo",
          defaultCurrency: defaultCurrency || "EGP",
          address: address || null,
          // Create subscription
          subscription: {
            create: {
              plan: plan as any,
              status: "TRIALING",
              maxUsers: plan === "FREE" ? 5 : plan === "PRO" ? 20 : 999,
              maxProjects: plan === "FREE" ? 50 : plan === "PRO" ? 200 : 9999,
              hasAssetAccess: plan === "PRO" || plan === "UNLIMITED",
              geoFencingEnabled: plan === "PRO" || plan === "UNLIMITED",
              advancedReporting: plan === "PRO" || plan === "UNLIMITED",
              hasGeoTracking: plan === "PRO" || plan === "UNLIMITED",
              hasNotifications: true,
            },
          },
          // Create admin user
          users: {
            create: {
              name: operatorName || "Admin",
              email: operatorEmail.toLowerCase().trim(),
              password: hashedPassword,
              role: "ADMIN",
              userType: "FULL_TIME",
              isActive: true,
            },
          },
          // Create default departments
          departments: {
            createMany: {
              data: [
                { name: "Creative" },
                { name: "Production" },
                { name: "Finance" },
                { name: "Operations" },
              ],
            },
          },
          // Create default task categories
          taskCategories: {
            createMany: {
              data: [
                { name: "Design" },
                { name: "Video Production" },
                { name: "Content Writing" },
                { name: "Strategy" },
                { name: "Administrative" },
              ],
            },
          },
          // Create initial reporting period
          reportingPeriods: {
            create: {
              name: `Period ${new Date().toLocaleDateString()}`,
              periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
              status: "OPEN",
            },
          },
          // Create default working hours
          workingHours: {
            createMany: {
              data: [
                { day: "Monday", openTime: "09:00", closeTime: "18:00" },
                { day: "Tuesday", openTime: "09:00", closeTime: "18:00" },
                { day: "Wednesday", openTime: "09:00", closeTime: "18:00" },
                { day: "Thursday", openTime: "09:00", closeTime: "18:00" },
                { day: "Friday", openTime: "09:00", closeTime: "18:00" },
                { day: "Saturday", openTime: "09:00", closeTime: "14:00" },
                { day: "Sunday", isClosed: true, openTime: "00:00", closeTime: "00:00" },
              ],
            },
          },
        },
        include: {
          users: {
            select: { id: true, email: true, role: true },
          },
          subscription: true,
        },
      });

      // 2. Get the admin user ID for audit log
      const adminUser = await tx.user.findFirst({
        where: {
          agencyId: agency.id,
          role: "ADMIN",
        },
        select: { id: true },
      });

      // 3. Create initial audit log
      if (adminUser) {
        await tx.auditLog.create({
          data: {
            action: "CREATE",
            entityType: "Agency",
            entityId: agency.id,
            message: `Agency "${agency.agencyName}" deployed with ${plan} plan`,
            agencyId: agency.id,
            actorId: adminUser.id,
          },
        });
      }

      return agency;
    });

    // ✅ Return success with agency ID
    return NextResponse.json(
      { 
        message: "Deployment successful", 
        agencyId: result.id,
        agencyName: result.agencyName,
        plan: plan,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("DEPLOYMENT_ERROR:", error);
    
    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An agency with this email already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Deployment failed. Please try again.", details: error?.message },
      { status: 500 }
    );
  }
}