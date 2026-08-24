import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

export const GET = withAuthGuard("user:read", async (req, { agencyId }) => {
  const db = getScopedPrisma(agencyId);

  const users = await db.user.findMany({
    where: {
      agencyId,
      isActive: true,
      clientId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
});