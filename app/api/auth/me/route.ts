import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";

// Any permission every logged-in role has is fine here — this route
// just echoes back the identity/agency context injected by middleware.
export const GET = withAuthGuard("task:read", async (req: NextRequest, { userId, agencyId, role }) => {
  return NextResponse.json({ userId, agencyId, role });
});