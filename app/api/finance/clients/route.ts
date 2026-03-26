import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return new NextResponse("Unauthorized", { status: 401 });

    try {
// Inside your GET function in app/api/finance/clients/route.ts
const clients = await prisma.client.findMany({
  where: { agencyId: session.user.agencyId },
  include: {
    projects: {
      include: {
        tasks: {
          include: { externalRentals: true } // Include the rentals
        },
      },
    },
    payments: { orderBy: { datePaid: 'desc' } },
  },
});

const clientData = clients.map((client) => {
  let totalClientProfit = 0;
  let totalClientCost = 0;

  client.projects.forEach((project) => {
    project.tasks.forEach((task) => {
      const taskProfit = task.grossRevenue * (task.margin / 100);
      // Cost calculation now includes external rentals
      const externalRentalsCost = task.externalRentals.reduce((sum, r) => sum + r.cost, 0);
      const taskProductionCost = task.grossRevenue - taskProfit;
      
      totalClientProfit += taskProfit;
      totalClientCost += (taskProductionCost + externalRentalsCost);
    });
  });

  const totalInvoiced = client.projects.reduce((acc, p) => acc + p.totalValue, 0);
  const totalPaid = client.payments.reduce((acc, p) => acc + p.amount, 0);

  return {
    id: client.id,
    name: client.clientName,
    projectsCount: client.projects.length,
    profit: totalClientProfit.toFixed(2),
    cost: totalClientCost.toFixed(2),
    due: (totalInvoiced - totalPaid).toFixed(2),
    status: (totalInvoiced - totalPaid) > 0 ? "Overdue" : "Paid",
    payments: client.payments // Full payment history for the new table
  };
});

    return NextResponse.json(clientData);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}