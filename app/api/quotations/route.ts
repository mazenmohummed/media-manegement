import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch quotations, optionally filtered by projectId, taskId, or vendorId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId");
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");
    const vendorId = searchParams.get("vendorId");

    if (!agencyId) {
      return NextResponse.json({ error: "agencyId is required" }, { status: 400 });
    }

    const quotations = await prisma.quotation.findMany({
      where: {
        agencyId,
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {}),
        // Filter by pivot table if vendorId is provided
        ...(vendorId
          ? {
              vendors: {
                some: { vendorId },
              },
            }
          : {}),
      },
      include: {
        vendors: {
          include: { vendor: true },
        },
        project: true,
        task: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotations, { status: 200 });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new quotation linked to multiple Vendors via the pivot table
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      agencyId,
      vendorIds, // Expecting an array of vendor IDs now
      projectId,
      taskId,
      quotationNo,
      description,
      amount,
      currency,
      validUntil,
      status,
      notes,
    } = body;

    if (!agencyId || !vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return NextResponse.json(
        { error: "agencyId and at least one vendorId are required fields." },
        { status: 400 }
      );
    }

    // Auto-generate Quotation Number if not provided
    let finalQuotationNo = quotationNo;
    if (!finalQuotationNo) {
      const count = await prisma.quotation.count({ where: { agencyId } });
      const year = new Date().getFullYear();
      finalQuotationNo = `QTN-${year}-${String(count + 1).padStart(3, "0")}`;
    }

    const quotation = await prisma.quotation.create({
      data: {
        agencyId,
        projectId: projectId || null,
        taskId: taskId || null,
        quotationNo: finalQuotationNo,
        description,
        amount: amount !== undefined && amount !== "" ? parseFloat(amount) : null,
        currency: currency || "EGP",
        validUntil: validUntil ? new Date(validUntil) : null,
        status: status || "REQUESTED",
        notes,
        vendors: {
          create: vendorIds.map((vId: string) => ({
            vendorId: vId,
          })),
        },
      },
      include: {
        vendors: {
          include: { vendor: true },
        },
        project: true,
        task: true,
      },
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("Error creating quotation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}