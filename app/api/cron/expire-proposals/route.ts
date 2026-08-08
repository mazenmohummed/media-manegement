// app/api/cron/expire-proposals/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ProposalStatus, AuditAction } from "@prisma/client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const expiring = await db.proposal.findMany({
    where: {
      validUntil: { lt: now },
      status: { in: [ProposalStatus.SENT, ProposalStatus.UNDER_REVIEW] },
    },
    select: { id: true, agencyId: true },
  });

  if (expiring.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  await db.$transaction([
    db.proposal.updateMany({
      where: { id: { in: expiring.map((p) => p.id) } },
      data: { status: ProposalStatus.EXPIRED },
    }),
    ...expiring.map((p) =>
      db.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          entityType: "Proposal",
          entityId: p.id,
          message: "Auto-expired: validUntil date passed",
          agencyId: p.agencyId,
        },
      })
    ),
  ]);

  return NextResponse.json({ expired: expiring.length });
}