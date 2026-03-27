import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const agencyId = session?.user?.agencyId;
  
  if (!agencyId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      where: { agencyId },
      include: {
        projects: {
          where: { agencyId },
          include: {
            tasks: {
              where: { agencyId },
              include: { 
                taskExpenses: { // Updated from externalRentals
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

    const clientData = clients.map((client) => {
      let totalClientProfit = 0;
      let totalProductionExpenses = 0;

      client.projects.forEach((project) => {
        project.tasks.forEach((task) => {
          const baseCost = Number(task.internalCost) || 0;
          const marginPercent = Number(task.margin) || 0;
          
          // Profit is the margin calculated on top of internal cost
          const taskProfit = baseCost * (marginPercent / 100);
          
          // Additional expenses (Rentals, Lunch, etc.)
          const taskExpensesCost = task.taskExpenses.reduce(
            (sum, e) => sum + (Number(e.cost) || 0), 0
          );
          
          totalClientProfit += taskProfit;
          totalProductionExpenses += (baseCost + taskExpensesCost);
        });
      });

      // Financial status based on Invoices vs Payments
      const totalInvoiced = client.projects.reduce((acc, p) => acc + (Number(p.totalValue) || 0), 0);
      const totalPaid = client.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const balanceDue = totalInvoiced - totalPaid;

      return {
        id: client.id,
        name: client.clientName,
        projectsCount: client.projects.length,
        profit: totalClientProfit.toFixed(2),
        totalExpenses: totalProductionExpenses.toFixed(2),
        due: balanceDue.toFixed(2),
        status: balanceDue > 0 ? "Pending/Overdue" : "Paid",
        lastPayments: client.payments.slice(0, 5) // Return only recent history for performance
      };
    });

    return NextResponse.json(clientData);
  } catch (error) {
    console.error("FINANCE_CLIENTS_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}