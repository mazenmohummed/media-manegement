import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // 1. SECURITY: Block if no valid agencyId is in the session
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;

    // 2. FETCH: Only expenses belonging to THIS agency
    // We also filter out payroll items to focus on "Overhead" (SaaS, Rent, etc.)
    const expenses = await prisma.expense.findMany({
      where: {
        agencyId: agencyId, // THE WALL
        NOT: {
          category: { in: ["Salary", "Bonus", "Commission"] }
        }
      },
      orderBy: { date: "desc" }
    });

    // 3. DATE LOGIC: Current Month Burn
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const totalBurn = monthlyExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    
    // 4. METRICS: Grouping for Stat Cards
    const fixedMonthly = monthlyExpenses
      .filter(exp => ["Infrastructure", "Utilities", "Rent"].includes(exp.category))
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    const saasTools = monthlyExpenses
      .filter(exp => ["Software", "Technology", "Subscription"].includes(exp.category))
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    const taxLegal = monthlyExpenses
      .filter(exp => ["Legal", "Taxes", "Insurance"].includes(exp.category))
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    return NextResponse.json({
      agencyId, 
      expenses,
      metrics: {
        totalBurn,
        fixedMonthly,
        saasTools,
        taxLegal,
        // Runway calculation (Assuming a mock $50k reserve or pull from Agency balance)
        runwayMonths: totalBurn > 0 ? (50000 / totalBurn).toFixed(1) : "∞"
      }
    });
  } catch (error) {
    console.error("OVERHEAD_GET_ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch overhead data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.resourceName || !body.amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 5. CREATE: Enforce Agency Wall by using session ID
    const expense = await prisma.expense.create({
      data: {
        resourceName: body.resourceName,
        category: body.category,
        amount: parseFloat(body.amount),
        status: body.status || "Pending",
        date: body.date ? new Date(body.date) : new Date(),
        // Connect directly to the agency from the session
        agency: {
          connect: { id: session.user.agencyId }
        }
      }
    });
    
    return NextResponse.json(expense);
  } catch (error: any) {
    console.error("OVERHEAD_POST_ERROR:", error);
    return NextResponse.json({ error: "Failed to log expense" }, { status: 500 });
  }
}