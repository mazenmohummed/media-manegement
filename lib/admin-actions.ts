import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

/**
 * Fetch Global Metrics for the SuperAdmin Dashboard
 * Includes Revenue, MRR, Agency List, and System Counts
 */
export async function getGlobalSystemData() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "SUPERADMIN") {
    throw new Error("Unauthorized Access: SuperAdmin privileges required.");
  }

  // 1. Setup Timeframes for MRR calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 2. Execute Concurrent Queries for Performance
  const [agencies, totalUsers, activeTrials, totalRevenueData, mrrData] = await Promise.all([
    // Fetch all agencies with nested subscription and paid invoices
    db.agency.findMany({
      include: {
        subscription: true,
        agencyInvoices: {
          where: { status: "PAID" },
          select: { amount: true }
        },
        _count: { 
          select: { users: true, projects: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    
    // Global System Counts
    db.user.count(),
    db.subscription.count({ where: { status: "TRIALING" } }),

    // Aggregate Total Lifetime Revenue
    db.agencyInvoice.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true }
    }),

    // Aggregate MRR (Subscription invoices paid in the last 30 days)
    db.agencyInvoice.aggregate({
      where: {
        status: "PAID",
        type: "SUBSCRIPTION",
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: { amount: true }
    })
  ]);

  // 3. Format Agency Data for the Table
  // Calculates individual LTV (Lifetime Value) per agency
  const formattedAgencies = agencies.map(agency => ({
    ...agency,
    revenue: agency.agencyInvoices.reduce((acc, inv) => acc + inv.amount, 0)
  }));

  return {
    totalAgencies: agencies.length,
    totalUsers,
    activeTrials,
    totalRevenue: totalRevenueData._sum.amount || 0,
    mrr: mrrData._sum.amount || 0,
    agencies: formattedAgencies
  };
}

/**
 * Kill Switch: Manually toggle an agency status
 */
export async function toggleAgencyStatus(agencyId: string, status: "ACTIVE" | "CANCELED") {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  await db.subscription.upsert({
    where: { agencyId },
    update: { 
      status,
      updatedAt: new Date() 
    },
    create: {
      agencyId,
      status,
      plan: "FREE",
    },
  });

  // Clear cache for dashboard and specific management page
  revalidatePath("/superadmin");
  revalidatePath(`/superadmin/agency/${agencyId}`);
}