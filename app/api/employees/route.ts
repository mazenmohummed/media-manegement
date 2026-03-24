import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    // 1. Pass authOptions to get the correct types
    const session = await getServerSession(authOptions);

    // 2. Use optional chaining and check specifically for the user
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Cast the session if the global types haven't kicked in yet (Emergency Fix)
    const userEmail = session.user.email;

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { agencyId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const employees = await prisma.user.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// app/api/employees/route.ts

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, userType, agencyId, verifiedSkills, password } = body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!name || !email || !agencyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newEmployee = await prisma.user.create({
      data: {
        name,
        email,
        role: role, 
        userType: userType,
        agencyId,
        verifiedSkills: verifiedSkills || [],
        efficiencyRate: 1.0,
        password: hashedPassword,
      },
    });

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error: any) {
    console.error("PRISMA ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}