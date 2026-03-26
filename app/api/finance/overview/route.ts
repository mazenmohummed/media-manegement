import { NextResponse } from "next/server";
import prisma  from "@/lib/prisma"; // Adjust path to your prisma helper

export async function GET() {
  try {
    // 1. Get Agency Context (Assuming one agency for now, or get from session)
    const agency = await prisma.agency.findFirst({
      include: {
        projects: true,
        users: true,
        assets: true,
        expenses: true,
      },
    });

    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    // 2. Client Partition: Revenue & Due
    const totalInvoiced = agency.projects.reduce((sum, p) => sum + p.totalValue, 0);
    const totalDue = agency.projects
      .filter((p) => p.invoiceStatus !== "PAID")
      .reduce((sum, p) => sum + p.totalValue, 0);

    // 3. Employee Partition: Payroll
    const monthlyPayroll = agency.users.reduce((sum, u) => sum + (u.salary || 0), 0);
    const avgEfficiency = agency.users.length 
      ? agency.users.reduce((sum, u) => sum + (u.efficiencyRate || 0), 0) / agency.users.length 
      : 0;

    // 4. Equipment Partition: Rentals & Assets
    // We need to fetch ExternalRentals separately as they are nested under Tasks
    const rentals = await prisma.externalRental.aggregate({
      _sum: { cost: true },
    });
    const assetValuation = agency.assets.reduce((sum, a) => sum + a.currentValue, 0);

    // 5. Overhead: Fixed Costs
    const fixedCosts = agency.expenses
      .filter(e => ["Infrastructure", "Software", "Utilities"].includes(e.category))
      .reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      clientStats: {
        totalDue,
        totalInvoiced,
        averageProjectProfit: totalInvoiced / (agency.projects.length || 1),
      },
      employeeStats: {
        monthlyPayroll,
        averageEfficiency: avgEfficiency.toFixed(2),
        topEarner: agency.users.sort((a, b) => (b.salary || 0) - (a.salary || 0))[0]?.name || "N/A",
      },
      equipmentStats: {
        rentalOutflow: rentals._sum.cost || 0,
        assetValuation,
      },
      overhead: {
        fixedCosts,
        burnRate: (monthlyPayroll + fixedCosts) / 30, // Rough daily burn
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch financials" }, { status: 500 });
  }
}