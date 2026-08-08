import { NextResponse } from "next/server";
import { withClientGuard } from "@/lib/auth/client-guard";
import { getClientPortalPrisma } from "@/lib/prisma/client-scoped";

export const GET = withClientGuard(async (req, ctx) => {
  // Scoped strictly to agencyId AND ctx.clientId
  const prisma = getClientPortalPrisma(ctx.agencyId, ctx.clientId);

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ projects });
});