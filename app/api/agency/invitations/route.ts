import { NextResponse } from "next/server";
import crypto from "crypto";
import { withAuthGuard } from "@/lib/auth/guard";
import { checkQuotaGuard } from "@/lib/auth/subscriptionGuard";
import { getScopedPrisma } from "@/lib/prisma";
import { createInvitationSchema } from "@/lib/validations/invitation";

// GET: Retrieve all active invitations for the agency
export const GET = withAuthGuard("user:read", async (req, { agencyId }) => {
  try {
    const db = getScopedPrisma(agencyId);

    const invitations = await db.invitation.findMany({
      where: { agencyId },
      include: {
        sentBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("[INVITATIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
});

// POST: Send/Upsert an invitation
export const POST = withAuthGuard("user:create", async (req, { agencyId, userId }) => {
  try {
    // 1. Quota / Subscription Limit Guard Check
    const quotaCheck = await checkQuotaGuard(agencyId, "users");
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.error,
          code: "PLAN_LIMIT_REACHED",
          meta: {
            resource: "users",
            currentPlan: quotaCheck.plan,
            limit: quotaCheck.limit,
            currentCount: quotaCheck.currentCount,
          },
        },
        { status: 403 }
      );
    }

    // 2. Input Validation
    const body = await req.json();
    const validation = createInvitationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role } = validation.data;
    const db = getScopedPrisma(agencyId);

    // 3. Check if user already exists in this agency
    const existingUser = await db.user.findFirst({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already belongs to this agency" },
        { status: 400 }
      );
    }

    // 4. Generate Raw Token & Cryptographic Hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Hours

    // 5. Upsert Invitation with explicit agencyId
    const invitation = await db.invitation.upsert({
      where: {
        agencyId_email: { agencyId, email },
      },
      update: {
        role,
        tokenHash,
        expiresAt,
        acceptedAt: null,
        sentById: userId,
      },
      create: {
        agencyId,
        email,
        role,
        tokenHash,
        expiresAt,
        sentById: userId,
      },
    });

    const inviteLink = `${process.env.NEXTAUTH_URL}/accept-invite?token=${rawToken}`;

    // Dispatch email with inviteLink containing the raw unhashed token
    console.log(`[INVITATION_SENT] To: ${email} | Link: ${inviteLink}`);

    return NextResponse.json(
      { message: "Invitation sent successfully", invitationId: invitation.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[INVITATIONS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});