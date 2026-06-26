import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    // 1. Authenticate session context
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    
    if (!agencyId) {
      return new NextResponse("Unauthorized Account Access", { status: 401 });
    }

    // 2. Fetch clients with isolated isolation layers on agency target parameters
    const clients = await prisma.client.findMany({
      where: { 
        agencyId 
      },
      include: {
        projects: {
          where: { agencyId },
          include: {
            tasks: {
              where: { agencyId },
              include: { 
                taskExpenses: { 
                  where: { agencyId } 
                } 
              } 
            },
          },
        },
        payments: { 
          where: { agencyId },
          orderBy: { datePaid: 'desc' } 
        },
      },
    });

    // 3. Map metrics pipelines matching the structural payload expected by the view
    const clientData = clients.map((client) => {
      let totalClientProfit = 0;
      let totalProductionExpenses = 0;

      client.projects.forEach((project) => {
        project.tasks.forEach((task) => {
          const baseCost = Number(task.internalCost) || 0;
          const marginPercent = Number(task.margin) || 0;
          
          // Profit is calculated dynamically via percentage margins on top of internal production costs
          const taskProfit = baseCost * (marginPercent / 100);
          
          // Aggregate any additional line-item expenses (Rentals, Lunch, Logistics, etc.)
          const taskExpensesCost = task.taskExpenses.reduce(
            (sum, e) => sum + (Number(e.cost) || 0), 0
          );
          
          totalClientProfit += taskProfit;
          totalProductionExpenses += (baseCost + taskExpensesCost);
        });
      });

      // Structural Balance-Due Calculations (Total Contract Value vs Liquid Received Capital)
      const totalInvoiced = client.projects.reduce((acc, p) => acc + (Number(p.totalValue) || 0), 0);
      const totalPaid = client.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const balanceDue = totalInvoiced - totalPaid;

      return {
        id: client.id,
        name: client.clientName,
        projectsCount: client.projects.length,
        profit: totalClientProfit.toFixed(2),
        totalExpenses: totalProductionExpenses.toFixed(2), // Matches client component field mapping
        due: balanceDue.toFixed(2),
        status: balanceDue > 0 ? "Pending/Overdue" : "Paid",
        lastPayments: client.payments.slice(0, 5).map(p => ({
          id: p.id,
          amount: Number(p.amount) || 0,
          datePaid: p.datePaid.toISOString(),
          method: p.method
        }))
      };
    });

    return NextResponse.json(clientData);

  } catch (error) {
    console.error("FINANCE_CLIENTS_METRICS_FETCH_CRITICAL_FAILURE:", error);
    return new NextResponse("Internal Database Execution Error", { status: 500 });
  }
}