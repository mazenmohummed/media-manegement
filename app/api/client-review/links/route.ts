// app/api/client-review/links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generatePassword(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ─── Helper Functions ──────────────────────────────────────────────────────

const getClientIP = (req: NextRequest): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
};

const getLocationFromIP = async (ip: string): Promise<{ country?: string; city?: string }> => {
  // This is a placeholder. You can integrate with a service like ipapi.co, ipinfo.io, etc.
  // For now, return empty object
  return {};
};

const sendExpirationNotification = async (
  reviewLink: any,
  client: any,
  concept: any
) => {
  if (!client.email) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reviewUrl = `${baseUrl}/client-review/${reviewLink.token}`;

  try {
    await sendEmail({
      to: client.email,
      subject: `Review Link Expiring Soon: ${concept.name}`,
      html: `
        <h2>Review Link Expiration Notice</h2>
        <p>Dear ${client.clientName},</p>
        <p>Your review link for <strong>${concept.name}</strong> will expire on <strong>${new Date(reviewLink.expiresAt).toLocaleDateString()}</strong>.</p>
        <p><a href="${reviewUrl}" style="padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px;">Open Review</a></p>
        <p>Please submit your feedback before the link expires.</p>
        <p>If you have any questions, please contact your agency.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send expiration notification:', error);
  }
};

// ─── POST Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user?.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 });
    }

    const body = await req.json();
    const {
      conceptId,
      clientId,
      expiresInDays,
      maxViews,
      // ─── New security options ────────────────────────────────────────────
      ipRestrictions, // Array of allowed IPs or CIDR ranges
      oneTimeUse,     // Boolean - if true, link expires after first view
      requirePassword, // Boolean - if true, client must enter password
      password,       // Custom password (optional, auto-generate if not provided)
      notifyOnExpiration, // Boolean - send notification when link expires
      notifyDaysBefore,   // Days before expiration to send reminder
    } = body;

    if (!conceptId || !clientId) {
      return NextResponse.json(
        { error: 'Concept ID and Client ID are required' },
        { status: 400 }
      );
    }

    // ─── Verify concept exists ─────────────────────────────────────────────
    const concept = await prisma.concept.findFirst({
      where: {
        id: conceptId,
        agencyId,
        project: {
          clientId,
        },
      },
      include: {
        project: {
          select: {
            projectName: true,
            clientId: true,
            client: {
              select: {
                clientName: true,
                email: true,
              },
            },
          },
        },
        assets: {
          include: {
            versions: {
              orderBy: { versionNo: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found or does not belong to this client' },
        { status: 404 }
      );
    }

    // ─── Calculate expiration ──────────────────────────────────────────────
    let expiresAt: Date | undefined;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // ─── Generate password if required ─────────────────────────────────────
    let generatedPassword: string | null = null;
    if (requirePassword) {
      generatedPassword = password || generatePassword();
    }

    // ─── Create review link ────────────────────────────────────────────────
    const reviewLink = await prisma.reviewLink.create({
      data: {
        token: generateToken(),
        conceptId,
        clientId,
        agencyId,
        expiresAt,
        maxViews: oneTimeUse ? 1 : (maxViews || 0),
        viewCount: 0,
        isActive: true,
        // ✅ Store security settings in reviewNotes as JSON
        reviewNotes: JSON.stringify({
          ipRestrictions: ipRestrictions || [],
          oneTimeUse: oneTimeUse || false,
          requirePassword: requirePassword || false,
          password: generatedPassword,
          notifyOnExpiration: notifyOnExpiration || false,
          notifyDaysBefore: notifyDaysBefore || 3,
          createdAt: new Date().toISOString(),
        }),
        assetApprovals: concept.assets.reduce((acc, asset) => {
          acc[asset.id] = 'PENDING';
          return acc;
        }, {} as Record<string, string>),
      },
    });

    // ─── Send notification to client ──────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reviewUrl = `${baseUrl}/client-review/${reviewLink.token}`;

    // Send email notification with security info
    if (concept.project.client.email) {
      let emailHtml = `
        <h2>Review Link Created</h2>
        <p>Dear ${concept.project.client.clientName},</p>
        <p>You have been invited to review <strong>${concept.name}</strong>.</p>
        <p><a href="${reviewUrl}" style="padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px;">Open Review</a></p>
      `;

      if (requirePassword) {
        emailHtml += `
          <p><strong>Password:</strong> ${generatedPassword}</p>
          <p style="color: #F59E0B; font-size: 14px;">🔒 This link is password-protected.</p>
        `;
      }

      if (oneTimeUse) {
        emailHtml += `<p style="color: #F59E0B; font-size: 14px;">⚠️ This link can only be used once.</p>`;
      }

      if (expiresAt) {
        emailHtml += `
          <p style="color: #6B7280; font-size: 14px;">Expires: ${new Date(expiresAt).toLocaleDateString()}</p>
        `;
      }

      emailHtml += `
        <p>Please review the assets and provide your feedback.</p>
        <p>If you have any questions, please contact your agency.</p>
      `;

      try {
        await sendEmail({
          to: concept.project.client.email,
          subject: `Review Invitation: ${concept.name}`,
          html: emailHtml,
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }

    // ─── Schedule expiration notification ─────────────────────────────────
    if (notifyOnExpiration && expiresAt && concept.project.client.email) {
      const daysBefore = notifyDaysBefore || 3;
      const notificationDate = new Date(expiresAt);
      notificationDate.setDate(notificationDate.getDate() - daysBefore);
      
      // Only schedule if notification date is in the future
      if (notificationDate > new Date()) {
        // Store the scheduled notification in database (you would need a scheduled job)
        // For now, we'll just log it
        console.log(`Expiration notification scheduled for ${notificationDate.toISOString()}`);
        
        // In production, you'd use a job queue like BullMQ, QStash, or similar
        // await scheduleJob(notificationDate, () => sendExpirationNotification(reviewLink, concept.project.client, concept));
      }
    }

    // ─── Return response ────────────────────────────────────────────────────
    return NextResponse.json({
      id: reviewLink.id,
      token: reviewLink.token,
      url: reviewUrl,
      expiresAt: reviewLink.expiresAt,
      maxViews: reviewLink.maxViews,
      oneTimeUse: oneTimeUse || false,
      requirePassword: requirePassword || false,
      password: generatedPassword, // Only returned in the initial response
      concept: {
        id: concept.id,
        name: concept.name,
        projectName: concept.project.projectName,
        assetCount: concept.assets.length,
      },
      client: {
        id: concept.project.clientId,
        name: concept.project.client.clientName,
        email: concept.project.client.email,
      },
      security: {
        ipRestrictions: ipRestrictions || [],
        oneTimeUse: oneTimeUse || false,
        requirePassword: requirePassword || false,
        notifyOnExpiration: notifyOnExpiration || false,
      },
    });

  } catch (error) {
    console.error('Error creating review link:', error);
    return NextResponse.json(
      { error: 'Failed to create review link' },
      { status: 500 }
    );
  }
}

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user?.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get('conceptId');
    const status = searchParams.get('status'); // active, expired, revoked
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = { agencyId };
    if (conceptId) {
      where.conceptId = conceptId;
    }

    // Filter by status
    if (status === 'active') {
      where.isActive = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    } else if (status === 'expired') {
      where.isActive = true;
      where.expiresAt = { lt: new Date() };
    } else if (status === 'revoked') {
      where.isActive = false;
    }

    const [links, total] = await Promise.all([
      prisma.reviewLink.findMany({
        where,
        include: {
          concept: {
            select: {
              id: true,
              name: true,
              status: true,
              project: {
                select: {
                  projectName: true,
                  client: {
                    select: {
                      clientName: true,
                    },
                  },
                },
              },
            },
          },
          client: {
            select: {
              clientName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.reviewLink.count({ where }),
    ]);

    // ─── Parse security settings from reviewNotes ────────────────────────
    const enrichedLinks = links.map((link) => {
      let securitySettings = {};
      try {
        if (link.reviewNotes) {
          const parsed = JSON.parse(link.reviewNotes);
          securitySettings = {
            ipRestrictions: parsed.ipRestrictions || [],
            oneTimeUse: parsed.oneTimeUse || false,
            requirePassword: parsed.requirePassword || false,
            hasPassword: !!parsed.password,
            notifyOnExpiration: parsed.notifyOnExpiration || false,
            notifyDaysBefore: parsed.notifyDaysBefore || 3,
          };
        }
      } catch {
        // Ignore parsing errors
      }

      return {
        ...link,
        security: securitySettings,
      };
    });

    return NextResponse.json({
      links: enrichedLinks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching review links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review links' },
      { status: 500 }
    );
  }
}

// ─── DELETE Handler ─────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agencyId = session.user?.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Soft delete (revoke) the link
    const reviewLink = await prisma.reviewLink.updateMany({
      where: {
        token,
        agencyId,
      },
      data: {
        isActive: false,
      },
    });

    if (reviewLink.count === 0) {
      return NextResponse.json(
        { error: 'Review link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review link revoked successfully',
    });

  } catch (error) {
    console.error('Error revoking review link:', error);
    return NextResponse.json(
      { error: 'Failed to revoke review link' },
      { status: 500 }
    );
  }
}