import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs"; // npm install bcryptjs

export async function POST(req: Request) {
  try {
    const { agencyName, operatorName, email, password } = await req.json();

    if (!email || !password || !agencyName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Operator already registered" }, { status: 400 });
    }

    // 2. Encrypt Password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Create Agency, Trial Subscription, and Admin User
    const result = await prisma.agency.create({
      data: {
        agencyName,
        operatorName,
        email,
        // Start with a Trial Subscription
        subscription: {
          create: {
            plan: "FREE",
            status: "TRIALING",
            maxUsers: 5,
            maxProjects: 50,
          }
        },
        // Create the first Admin User linked to this Agency
        users: {
          create: {
            name: operatorName,
            email,
            password: hashedPassword,
            role: "ADMIN",
            userType: "FULL_TIME"
          }
        }
      }
    });

    return NextResponse.json({ success: true, agencyId: result.id }, { status: 201 });

  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json({ message: "Internal System Error" }, { status: 500 });
  }
}