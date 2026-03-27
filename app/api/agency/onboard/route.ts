import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db"; // Point to your Prisma client

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  // 1. Auth Guard
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch fresh user state to prevent double-onboarding
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, agencyId: true }
  });

  if (user?.agencyId) {
    return NextResponse.json({ error: "Agency already configured for this account" }, { status: 400 });
  }

  const { agencyName } = await req.json();

  if (!agencyName || agencyName.length < 3) {
    return NextResponse.json({ error: "Invalid Agency Name" }, { status: 400 });
  }

  try {
    // 3. ATOMIC TRANSACTION: Everything happens or nothing happens
    const result = await db.$transaction(async (tx) => {
      // Create the Agency
      const agency = await tx.agency.create({
        data: {
          agencyName,
          operatorName: session.user.name || "System Admin",
          email: session.user.email!,
        },
      });

      // Create a Free-Tier Subscription by default
      await tx.subscription.create({
        data: {
          agencyId: agency.id,
          plan: "FREE",
          status: "TRIALING",
        },
      });

      // Update the User to be an ADMIN of this new Agency
      const updatedUser = await tx.user.update({
        where: { id: user!.id },
        data: { 
          agencyId: agency.id,
          role: "ADMIN" 
        },
      });

      return { agency, updatedUser };
    });

    // 4. Return data needed for the Next-Auth session update()
    return NextResponse.json({
      message: "Deployment Successful",
      agencyId: result.agency.id,
      agencyName: result.agency.agencyName,
      role: result.updatedUser.role
    });

  } catch (error) {
    console.error("ONBOARDING_CRITICAL_FAILURE:", error);
    return NextResponse.json({ error: "Database transaction failed" }, { status: 500 });
  }
}