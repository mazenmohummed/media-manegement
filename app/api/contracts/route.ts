import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ContractStatus, UserRole } from "@prisma/client";

const ELIGIBLE_EMPLOYEE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
  UserRole.TEAMLEADER,
  UserRole.CREATIVE,
];

// GET: List contracts for the agency with filtering & pagination
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = session.user.agencyId;

    const status = searchParams.get("status") as ContractStatus | null;
    const clientId = searchParams.get("clientId");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const whereClause: any = { agencyId };
    if (status && Object.values(ContractStatus).includes(status)) {
      whereClause.status = status;
    }
    if (clientId) whereClause.clientId = clientId;
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contractNo: { contains: search, mode: "insensitive" } },
        { client: { clientName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [contracts, total] = await Promise.all([
      db.contract.findMany({
        where: whereClause,
        include: {
          client: { select: { id: true, clientName: true, email: true } },
          user: { select: { id: true, name: true, role: true } },
          _count: { select: { projects: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.contract.count({ where: whereClause }),
    ]);

    return NextResponse.json(
      {
        data: contracts,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[CONTRACTS_LIST_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

// POST: Create a standalone contract
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const body = await request.json();

    const {
      name,
      clientId,
      userId,
      status,
      startDate,
      endDate,
      monthlyValue,
      currency,
      termsUrl,
    } = body;

    // Validation
    if (!name || !clientId) {
      return NextResponse.json(
        { error: "Contract name and client are required" },
        { status: 400 }
      );
    }

    // Verify client belongs to agency
    const client = await db.client.findFirst({
      where: { id: clientId, agencyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // Validate assigned user if provided
    if (userId) {
      const user = await db.user.findFirst({
        where: { id: userId, agencyId },
        select: { role: true },
      });
      if (!user) {
        return NextResponse.json(
          { error: "Assigned employee not found" },
          { status: 404 }
        );
      }
      if (!ELIGIBLE_EMPLOYEE_ROLES.includes(user.role)) {
        return NextResponse.json(
          { error: `Role '${user.role}' is not eligible for assignment` },
          { status: 403 }
        );
      }
    }

    // Generate contract number
    const contractCount = await db.contract.count({ where: { agencyId } });
    const contractNo = `CNT-${new Date().getFullYear()}-${String(
      contractCount + 1
    ).padStart(4, "0")}`;

    const contract = await db.contract.create({
      data: {
        contractNo,
        name,
        clientId,
        agencyId,
        userId: userId || undefined,
        status: status || ContractStatus.DRAFT,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        monthlyValue: monthlyValue ? parseFloat(monthlyValue) : undefined,
        currency: currency || "EGP",
        termsUrl: termsUrl || undefined,
      },
      include: {
        client: { select: { id: true, clientName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error: any) {
    console.error("[CONTRACT_CREATE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create contract" },
      { status: 500 }
    );
  }
}