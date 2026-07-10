import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

type PlanKey = "FREE" | "PRO" | "UNLIMITED";

type DeployPayload = {
  agencyName?: string;
  agencyEmail?: string;
  phoneNumber?: string;
  field?: string;
  timezone?: string;
  defaultCurrency?: string;
  address?: string;
  plan?: PlanKey;
  operatorName?: string;
  operatorEmail?: string;
  password?: string;
};

const PLAN_CONFIG: Record<
  PlanKey,
  {
    maxUsers: number;
    maxProjects: number;
    hasAssetAccess: boolean;
    geoFencingEnabled: boolean;
    advancedReporting: boolean;
    hasGeoTracking: boolean;
    hasNotifications: boolean;
    status: "ACTIVE" | "TRIALING";
  }
> = {
  FREE: {
    maxUsers: 5,
    maxProjects: 50,
    hasAssetAccess: false,
    geoFencingEnabled: false,
    advancedReporting: false,
    hasGeoTracking: false,
    hasNotifications: true,
    status: "ACTIVE",
  },
  PRO: {
    maxUsers: 20,
    maxProjects: 200,
    hasAssetAccess: true,
    geoFencingEnabled: true,
    advancedReporting: true,
    hasGeoTracking: true,
    hasNotifications: true,
    status: "TRIALING",
  },
  UNLIMITED: {
    maxUsers: 9999,
    maxProjects: 9999,
    hasAssetAccess: true,
    geoFencingEnabled: true,
    advancedReporting: true,
    hasGeoTracking: true,
    hasNotifications: true,
    status: "TRIALING",
  },
};

const DEFAULT_DEPARTMENTS = ["Operations", "Creative", "Finance", "Production"];
const DEFAULT_TASK_CATEGORIES = [
  "Strategy",
  "Design",
  "Content",
  "Shoot",
  "Editing",
  "Client Review",
  "Delivery",
];

const clean = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeEmail = (value?: string) => clean(value)?.toLowerCase();

const normalizePlan = (plan?: string): PlanKey => {
  if (plan === "PRO" || plan === "UNLIMITED") return plan;
  return "FREE";
};

const currentReportingPeriod = () => {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const name = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;

  return { name, periodStart, periodEnd };
};

const publicAgencySelect = {
  id: true,
  agencyNo: true,
  agencyName: true,
  email: true,
  timezone: true,
  defaultCurrency: true,
  subscription: {
    select: {
      plan: true,
      status: true,
      maxUsers: true,
      maxProjects: true,
      hasAssetAccess: true,
      geoFencingEnabled: true,
      advancedReporting: true,
    },
  },
};

const publicUserSelect = {
  id: true,
  userNo: true,
  name: true,
  email: true,
  role: true,
  userType: true,
  agencyId: true,
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DeployPayload;
    const agencyName = clean(body.agencyName);
    const agencyEmail = normalizeEmail(body.agencyEmail);
    const operatorName = clean(body.operatorName);
    const operatorEmail = normalizeEmail(body.operatorEmail);
    const password = body.password;
    const plan = normalizePlan(body.plan);
    const selectedPlan = PLAN_CONFIG[plan];

    if (!agencyName || !agencyEmail || !operatorName || !operatorEmail || !password) {
      return NextResponse.json(
        { error: "Missing required deployment fields." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const [existingUser, existingAgency] = await Promise.all([
      prisma.user.findUnique({ where: { email: operatorEmail } }),
      prisma.agency.findUnique({ where: { email: agencyEmail } }),
    ]);

    if (existingUser) {
      return NextResponse.json(
        { error: "Admin email is already registered." },
        { status: 409 }
      );
    }

    if (existingAgency) {
      return NextResponse.json(
        { error: "Agency email is already registered." },
        { status: 409 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedAgencyNo = `MAG-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    const generatedUserNo = `USR-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    const hashedPassword = await bcrypt.hash(password, 12);
    const reportingPeriod = currentReportingPeriod();

    const result = await prisma.$transaction(
      async (tx) => {
        const agency = await tx.agency.create({
          data: {
            agencyNo: generatedAgencyNo,
            agencyName,
            operatorName,
            email: agencyEmail,
            phoneNumber: clean(body.phoneNumber),
            field: clean(body.field),
            timezone: clean(body.timezone) ?? "Africa/Cairo",
            defaultCurrency: clean(body.defaultCurrency) ?? "EGP",
            address: clean(body.address),
            subscription: {
              create: {
                plan,
                status: selectedPlan.status,
                maxUsers: selectedPlan.maxUsers,
                maxProjects: selectedPlan.maxProjects,
                hasAssetAccess: selectedPlan.hasAssetAccess,
                geoFencingEnabled: selectedPlan.geoFencingEnabled,
                advancedReporting: selectedPlan.advancedReporting,
                hasGeoTracking: selectedPlan.hasGeoTracking,
                hasNotifications: selectedPlan.hasNotifications,
              },
            },
          },
          select: publicAgencySelect,
        });

        const adminUser = await tx.user.create({
          data: {
            userNo: generatedUserNo,
            name: operatorName,
            email: operatorEmail,
            password: hashedPassword,
            role: "ADMIN",
            userType: "FULL_TIME",
            agencyId: agency.id,
          },
          select: publicUserSelect,
        });

        await tx.department.createMany({
          data: DEFAULT_DEPARTMENTS.map((name) => ({
            name,
            agencyId: agency.id,
          })),
        });

        await tx.taskCategory.createMany({
          data: DEFAULT_TASK_CATEGORIES.map((name) => ({
            name,
            agencyId: agency.id,
          })),
        });

        await tx.reportingPeriod.create({
          data: {
            ...reportingPeriod,
            status: "OPEN",
            agencyId: agency.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "CREATE",
            entityType: "Agency",
            entityId: agency.id,
            message: "Agency workspace deployed.",
            actorId: adminUser.id,
            agencyId: agency.id,
            metadata: {
              plan,
              agencyNo: agency.agencyNo,
              userNo: adminUser.userNo,
            },
          },
        });

        return { agency, user: adminUser };
      },
      {
        maxWait: 5000,
        timeout: 20000,
      }
    );

    return NextResponse.json(
      {
        message: "Agency workspace deployed successfully.",
        ...result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("DEPLOYMENT_FATAL:", error);

    if (error?.code === "P2028") {
      return NextResponse.json(
        {
          error: "Transaction expired.",
          details: "The deployment took too long. Please try again or check database latency.",
        },
        { status: 504 }
      );
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error: "Unique constraint collision.",
          details: `The field ${error.meta?.target || "unknown"} is already in use.`,
        },
        { status: 409 }
      );
    }

    if (error?.code === "P2010" || String(error?.message || "").toLowerCase().includes("timeout")) {
      return NextResponse.json(
        {
          error: "Database connection timed out.",
          details: "Check MongoDB Atlas network access and database connection latency.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Infrastructure deployment failed.",
        details: error?.message || "Unknown deployment error.",
      },
      { status: 500 }
    );
  }
}
