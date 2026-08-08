import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/users ───────────────────────────────────────────────────────
export const GET = withAuthGuard("user:read", async (req, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error("[USERS_GET_ERROR]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});