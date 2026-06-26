import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;
    
    if (!agencyId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const history = await prisma.payout.findMany({
      where: { 
        agencyId,
        category: { in: ["Salary", "Bonus", "Commission", "Payroll"] } 
      },
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      orderBy: { date: "desc" },
      take: 30
    });

    // Map database structures into exactly what EmployeeFinancePage.tsx expects
    const formattedHistory = history.map((payout) => ({
      id: payout.id,
      employeeId: payout.userId, // Map userId straight to employeeId
      amount: Number(payout.amount) || 0,
      category: payout.category,
      status: payout.status || "PAID",
      date: payout.date || payout.createdAt,
      description: payout.description,
      // Map the joined user relation name flat onto resourceName
      resourceName: payout.user?.name || "Staff Member" 
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error("PAYROLL_HISTORY_GET_ERROR:", error);
    return new NextResponse("Internal Database Query Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const agencyId = session?.user?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: "Unauthorized access context" }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, amount, category, date, description, status, payoutNo } = body;

    if (!employeeId || !amount) {
      return NextResponse.json({ error: "Missing required payout parameters" }, { status: 400 });
    }

    const targetEmployee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { agencyId: true }
    });

    if (!targetEmployee || targetEmployee.agencyId !== agencyId) {
      return NextResponse.json({ error: "Invalid target allocation entity for agency context" }, { status: 403 });
    }

    const newPayout = await prisma.payout.create({
      data: {
        amount: parseFloat(amount) || 0,
        category: category || "Salary",
        status: status || "PAID",
        date: date ? new Date(date) : new Date(),
        description: description || "Staff Operating Payout", 
        payoutNo: payoutNo || null,
        agencyId, 
        userId: employeeId, 
      },
    });

    return NextResponse.json(newPayout);
  } catch (error: any) {
    console.error("POST_PAYOUT_ERROR:", error);
    return NextResponse.json({ 
      error: "Failed to allocate payout record", 
      details: error.message 
    }, { status: 500 });
  }
}