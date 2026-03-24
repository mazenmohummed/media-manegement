// app/api/auth/deploy/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agencyName, agencyEmail, name, email, password } = body;

    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Agency
    const agency = await prisma.agency.create({
      data: {
        agencyName,
        email: agencyEmail,
        operatorName: name,
      },
    });

    // 2. Create Subscription
    await prisma.subscription.create({
      data: {
        agencyId: agency.id,
        plan: "FREE",
      },
    });

    // 3. Create User
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        agencyId: agency.id,
      },
    });

    return NextResponse.json({ message: "Success" }, { status: 201 });
  } catch (error: any) {
     console.error("DEPLOYMENT_ERROR:", error);
     return NextResponse.json({ message: "Deployment Failed" }, { status: 500 });
  }
}