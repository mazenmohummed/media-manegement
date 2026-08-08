import { NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

// ─── GET /api/users/leaves ────────────────────────────────────────────────
export const GET = withAuthGuard("user:read", async (req, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);

    // Fetches all users scoped to the current agency along with their embedded leaves array
    const usersWithLeaves = await db.user.findMany({
      select: {
        id: true,
        name: true,
        leaves: true,
      },
    });

    return NextResponse.json(usersWithLeaves, { status: 200 });
  } catch (error: any) {
    console.error("[LEAVES_GET_ALL_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch leaves structural array data", details: error.message },
      { status: 500 }
    );
  }
});