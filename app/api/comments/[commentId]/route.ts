import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard } from "@/lib/auth/guard";
import { getScopedPrisma } from "@/lib/prisma";

export const DELETE = withAuthGuard("comment:delete", async (req: NextRequest, { agencyId }, context) => {
  const { commentId } = await context.params;
  const db = getScopedPrisma(agencyId);

  const comment = await db.comment.findFirst({ where: { id: commentId, agencyId } });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  if (comment.authorId !== userId && !["ADMIN", "SUPERADMIN"].includes(userRole ?? "")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await db.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
});