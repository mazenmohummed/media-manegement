import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agencyName, operatorName } = await req.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Agency
      const agency = await tx.agency.create({
        data: {
          agencyName,
          operatorName,
          email: session.user.email,
        },
      });

      // 2. Create Default Subscription
      await tx.subscription.create({
        data: {
          agencyId: agency.id,
          plan: "FREE",
          status: "TRIALING",
        },
      });

      // 3. Update User to link to Agency
      const updatedUser = await tx.user.update({
        where: { email: session.user.email! },
        data: { agencyId: agency.id },
      });

      return { agency, updatedUser };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to initialize agency" }, { status: 500 });
  }
}
