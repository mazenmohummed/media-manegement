import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

interface RouteParams {
  params: Promise<{ contractId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contractId } = await params;

    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: {
        client: { select: { id: true, clientName: true, email: true } },
        user: { select: { id: true, name: true, role: true } },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            totalValue: true,
            currency: true,
          },
        },
        proposal: {
          select: { id: true, proposalNo: true, totalAmount: true, currency: true },
        },
      },
    });

    if (!contract || contract.agencyId !== session.user.agencyId) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json(contract, { status: 200 });
  } catch (error: any) {
    console.error("[CONTRACT_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.user.agencyId;
    const { contractId } = await params;

    const existingContract = await db.contract.findUnique({
      where: { id: contractId },
    });

    if (!existingContract || existingContract.agencyId !== agencyId) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

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

    const updatedContract = await db.contract.update({
      where: { id: contractId },
      data: {
        ...(name && { name }),
        ...(clientId && { clientId }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(status && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(monthlyValue !== undefined && { monthlyValue: monthlyValue ? parseFloat(monthlyValue) : null }),
        ...(currency && { currency }),
        ...(termsUrl !== undefined && { termsUrl: termsUrl || null }),
      },
    });

    return NextResponse.json(updatedContract, { status: 200 });
  } catch (error: any) {
    console.error("[CONTRACT_UPDATE_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update contract" },
      { status: 500 }
    );
  }
}