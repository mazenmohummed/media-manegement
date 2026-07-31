import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import basePrisma from "@/lib/prisma";
import basePrisma from "@/lib/prisma";
import { acceptInvitationSchema } from "@/lib/validations/invitation";


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawToken = searchParams.get("token");

    if (!rawToken) {
      return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
    }

    // Hash incoming token to search DB
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const invitation = await basePrisma.invitation.findUnique({
      where: { tokenHash },
      include: { agency: { select: { agencyName: true } } },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation token has already been used" },
        { status: 410 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation token has expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      agencyName: invitation.agency.agencyName,
    });
  } catch (error) {
    console.error("[INVITATION_VALIDATE_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = acceptInvitationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token: rawToken, name, password } = validation.data;

    // Hash token for database matching
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const invitation = await basePrisma.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation token has already been used" },
        { status: 410 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation token has expired" },
        { status: 410 }
      );
    }

    // Atomic User Creation/Linking and Invitation Resolution
    const result = await basePrisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: invitation.email },
      });

      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            agencyId: invitation.agencyId,
            role: invitation.role,
          },
        });
      } else {
        if (!name || !password) {
          throw new Error("MISSING_CREDENTIALS");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user = await tx.user.create({
          data: {
            name,
            email: invitation.email,
            password: hashedPassword,
            role: invitation.role,
            agencyId: invitation.agencyId,
          },
        });
      }

      // Mark invitation accepted and record associated user ID
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
          userId: user.id,
        },
      });

      return user;
    });

    const { password: _pw, ...safeUser } = result as any;
    return NextResponse.json({
      message: "Invitation accepted successfully",
      user: safeUser,
    });
  } catch (error: any) {
    if (error.message === "MISSING_CREDENTIALS") {
      return NextResponse.json(
        { error: "Name and password are required for new user registration" },
        { status: 400 }
      );
    }

    console.error("[INVITATION_ACCEPT_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}