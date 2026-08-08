import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      agencyName,
      agencyEmail,
      phoneNumber,
      field,
      timezone,
      defaultCurrency,
      address,
      plan = "FREE",
      operatorName,
      operatorEmail,
      password,
    } = body;

    // Validate minimum required fields
    if (!agencyName || !agencyEmail || !operatorEmail || !password) {
      return NextResponse.json(
        { details: "Missing required deployment fields." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: operatorEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { details: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Single Atomic Transaction using Prisma Nested Writes
    const newAgency = await prisma.agency.create({
      data: {
        agencyName,
        email: agencyEmail.toLowerCase().trim(),
        // If your schema includes optional metadata fields:
        ...(phoneNumber && { phoneNumber }),
        ...(field && { field }),
        ...(timezone && { timezone }),
        ...(defaultCurrency && { defaultCurrency }),
        ...(address && { address }),
        users: {
          create: {
            name: operatorName,
            email: operatorEmail.toLowerCase().trim(),
            password: hashedPassword,
            role: "ADMIN",
          },
        },
        subscription: {
          create: {
            plan: plan as any, // FREE | PRO | UNLIMITED
            status: "TRIALING",
          },
        },
      },
      include: {
        users: { select: { id: true, email: true, role: true } },
        subscription: true,
      },
    });

    return NextResponse.json(
      { message: "Success", agencyId: newAgency.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("DEPLOYMENT_ERROR:", error);
    return NextResponse.json(
      { details: error?.message || "Deployment Failed" },
      { status: 500 }
    );
  }
}