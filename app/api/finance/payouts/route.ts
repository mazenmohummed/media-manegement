import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// GET: Fetch recent payroll expenses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const history = await prisma.expense.findMany({
      where: { 
        agencyId: session.user.agencyId,
        category: { in: ["Salary", "Bonus", "Commission", "Payroll"] } 
      },
      orderBy: { date: "desc" },
      take: 20
    });

    return NextResponse.json(history);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST: Record a manual payout/expense from the modal
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { resourceName, category, amount, status, date } = body;

    const expense = await prisma.expense.create({
      data: {
        resourceName,
        category,
        amount,
        status,
        date: new Date(date),
        agencyId: session.user.agencyId,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("PAYOUT_POST_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}