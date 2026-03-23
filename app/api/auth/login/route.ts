import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Credentials required" }, { status: 400 });
    }

    // 1. Locate user in the grid
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        agency: true, // Fetch agency details too
      }
    });

    if (!user || !user.password) {
      return NextResponse.json({ message: "Invalid Access Credentials" }, { status: 401 });
    }

    // 2. Compare hashed Access Key
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ message: "Invalid Access Credentials" }, { status: 401 });
    }

    // 3. Success
    // In production, you would set a cookie with a JWT here
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        agencyName: user.agency.agencyName
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Terminal Connection Error" }, { status: 500 });
  }
}