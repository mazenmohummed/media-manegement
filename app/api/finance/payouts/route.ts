import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// GET: Fetch recent payroll-related expenses for the agency
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. SECURITY: Block if no valid agencyId is in the session
    if (!session?.user?.agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const agencyId = session.user.agencyId;

    const history = await prisma.expense.findMany({
      where: { 
        agencyId: agencyId, // THE WALL
        category: { in: ["Salary", "Bonus", "Commission", "Payroll"] } 
      },
      include: {
        user: { // Include the employee details for the history table
          select: { name: true, role: true }
        }
      },
      orderBy: { date: "desc" },
      take: 20
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("PAYROLL_GET_ERROR:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST: Record a new payout and link it to an employee
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const body = await req.json();
    const { employeeId, amount, category, date, resourceName, status } = body;

    // 2. CROSS-CHECK: Ensure the employee belongs to THIS agency before linking
    const targetEmployee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { agencyId: true }
    });

    if (!targetEmployee || targetEmployee.agencyId !== agencyId) {
      return NextResponse.json({ error: "Invalid Employee ID for this agency" }, { status: 403 });
    }

    // 3. CREATE: Enforce Agency Wall
    const newExpense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount) || 0,
        category: category || "Salary",
        status: status || "PAID",
        date: date ? new Date(date) : new Date(),
        resourceName: resourceName || "Staff Payout",
        agencyId: agencyId, // THE WALL
        // Links the expense to the specific User in the database
        userId: employeeId, 
      },
    });

    return NextResponse.json(newExpense);
  } catch (error: any) {
    console.error("POST_PAYOUT_ERROR:", error);
    return NextResponse.json({ 
      error: "Failed to create payout", 
      details: error.message 
    }, { status: 500 });
  }
}