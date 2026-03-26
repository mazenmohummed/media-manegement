import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Fetch all expenses belonging to categories that aren't "Salary" or "Bonus"
    // (Assuming agencyId is handled by your auth session, add that filter as needed)
    const expenses = await prisma.expense.findMany({
      where: {
        NOT: {
          category: { in: ["Salary", "Bonus", "Commission"] }
        }
      },
      orderBy: { date: "desc" }
    });

    // 2. Calculate Metrics
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const totalBurn = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Grouping for Stat Cards
    const fixedMonthly = expenses
      .filter(exp => exp.category === "Infrastructure" || exp.category === "Utilities")
      .reduce((sum, exp) => sum + exp.amount, 0);

    const saasTools = expenses
      .filter(exp => exp.category === "Software" || exp.category === "Technology")
      .reduce((sum, exp) => sum + exp.amount, 0);

    const taxLegal = expenses
      .filter(exp => exp.category === "Legal" || exp.category === "Taxes")
      .reduce((sum, exp) => sum + exp.amount, 0);

    return NextResponse.json({
      expenses,
      metrics: {
        totalBurn,
        fixedMonthly,
        saasTools,
        taxLegal,
        // Mocking cash reserve for runway calculation (usually from a separate model)
        runwayMonths: (50000 / totalBurn).toFixed(1) 
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch overhead" }, { status: 500 });
  }
}

// app/api/finance/overhead/route.ts

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // VALIDATION: Check if values are coming through
    if (!body.resourceName || !body.amount || !body.agencyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        resourceName: body.resourceName,
        category: body.category,
        amount: parseFloat(body.amount),
        status: body.status || "Pending",
        date: new Date(body.date),
        // CRITICAL: This agencyId MUST exist in your Agency table
        agency: {
          connect: { id: body.agencyId }
        }
      }
    });
    
    return NextResponse.json(expense);
  } catch (error: any) {
    console.error("Prisma Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}