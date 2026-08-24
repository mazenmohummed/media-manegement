import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
 
// Echoes back the identity/agency context that middleware injected as headers.
// Must NOT live under /api/auth/* — that prefix is bypassed by middleware
// (see middleware.ts step 1) so no headers would ever be injected here.
export const GET = withAuthGuard("task:read", async (req: NextRequest, { userId, agencyId, role }) => {
  return NextResponse.json({ userId, agencyId, role });
});
 