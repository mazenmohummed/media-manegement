// app/api/client-review/links/[token]/access-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AccessLogEntry {
  id: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string | null;
  location: {
    country?: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  status: 'ALLOWED' | 'BLOCKED' | 'PASSWORD_REQUIRED' | 'PASSWORD_FAILED' | 'EXPIRED' | 'REVOKED';
  reason?: string;
  metadata?: {
    viewCount?: number;
    maxViews?: number;
    passwordAttempted?: boolean;
    requiresPassword?: boolean;
  };
}

interface AccessLogSummary {
  timestamp: Date;
  status: string;
  ipAddress: string;
  location: any;
  reason?: string;
}

interface AccessLogResponse {
  success: boolean;
  data: {
    reviewLink: {
      id: string;
      token: string;
      conceptId: string;
      conceptName: string;
      clientId: string;
      clientName: string;
      createdAt: string;
      expiresAt: string | null;
      isActive: boolean;
      viewCount: number;
      maxViews: number;
    };
    logs: AccessLogEntry[];
    summary: {
      total: number;
      allowed: number;
      blocked: number;
      passwordFailures: number;
      uniqueIPs: number;
      lastAccessAt: string | null;
      suspiciousAttempts: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// ─── Helper Functions ──────────────────────────────────────────────────────

const getClientIP = (req: NextRequest): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
};

const getUserAgent = (req: NextRequest): string | null => {
  return req.headers.get('user-agent') || null;
};

const getLocationFromIP = async (ip: string): Promise<{ 
  country?: string; 
  city?: string; 
  region?: string;
  latitude?: number;
  longitude?: number;
}> => {
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return {};
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name,
        city: data.city,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
      };
    }
  } catch (error) {
    console.error('Failed to get location for IP:', error);
  }

  return {};
};

const detectSuspiciousActivity = (
  logs: AccessLogEntry[],
  newLog: Partial<AccessLogEntry>
): { isSuspicious: boolean; reason?: string } => {
  const recentPasswordFailures = logs.filter(
    (l) => l.ipAddress === newLog.ipAddress &&
          l.status === 'PASSWORD_FAILED' &&
          new Date(l.timestamp).getTime() > Date.now() - 15 * 60 * 1000
  );

  if (recentPasswordFailures.length >= 5) {
    return {
      isSuspicious: true,
      reason: `Multiple password failures (${recentPasswordFailures.length}) from IP ${newLog.ipAddress} in 15 minutes`,
    };
  }

  const recentRequests = logs.filter(
    (l) => l.ipAddress === newLog.ipAddress &&
          new Date(l.timestamp).getTime() > Date.now() - 60 * 1000
  );

  if (recentRequests.length >= 20) {
    return {
      isSuspicious: true,
      reason: `Too many requests (${recentRequests.length}) from IP ${newLog.ipAddress} in 1 minute`,
    };
  }

  const uniqueCountries = new Set(
    logs
      .filter((l) => new Date(l.timestamp).getTime() > Date.now() - 60 * 60 * 1000)
      .map((l) => l.location?.country)
      .filter((c): c is string => !!c)
  );

  if (newLog.location?.country && uniqueCountries.size >= 3) {
    const countries = [...uniqueCountries, newLog.location.country];
    if (countries.length >= 4) {
      return {
        isSuspicious: true,
        reason: `Access from multiple countries (${countries.join(', ')}) in 1 hour`,
      };
    }
  }

  return { isSuspicious: false };
};

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const reviewLink = await prisma.reviewLink.findFirst({
      where: {
        token,
        agencyId: session.user.agencyId,
      },
      include: {
        concept: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: 'Review link not found or unauthorized' },
        { status: 404 }
      );
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ReviewLink',
        entityId: reviewLink.id,
        agencyId: session.user.agencyId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      skip,
      take: limit,
    });

    const logs: AccessLogEntry[] = await Promise.all(
      auditLogs.map(async (log) => {
        const metadata = log.metadata as any || {};
        const ip = metadata.ipAddress || 'unknown';
        const location = metadata.location || {};
        
        return {
          id: log.id,
          timestamp: log.timestamp.toISOString(),
          ipAddress: ip,
          userAgent: metadata.userAgent || null,
          location: {
            country: location.country,
            city: location.city,
            region: location.region,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          status: metadata.status || 'ALLOWED',
          reason: metadata.reason || null,
          metadata: {
            viewCount: metadata.viewCount,
            maxViews: metadata.maxViews,
            passwordAttempted: metadata.passwordAttempted,
            requiresPassword: metadata.requiresPassword,
          },
        };
      })
    );

    const allLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ReviewLink',
        entityId: reviewLink.id,
        agencyId: session.user.agencyId,
      },
      select: {
        timestamp: true,
        metadata: true,
      },
    });

    // Fix: Properly type the logs with reason property
    const allAccessLogs: AccessLogSummary[] = allLogs.map((log) => {
      const metadata = log.metadata as any || {};
      return {
        timestamp: log.timestamp,
        status: metadata.status || 'ALLOWED',
        ipAddress: metadata.ipAddress || 'unknown',
        location: metadata.location || {},
        reason: metadata.reason || undefined,
      };
    });

    const summary = {
      total: allAccessLogs.length,
      allowed: allAccessLogs.filter(l => l.status === 'ALLOWED' || l.status === 'PASSWORD_REQUIRED').length,
      blocked: allAccessLogs.filter(l => l.status === 'BLOCKED').length,
      passwordFailures: allAccessLogs.filter(l => l.status === 'PASSWORD_FAILED').length,
      uniqueIPs: new Set(allAccessLogs.map(l => l.ipAddress)).size,
      lastAccessAt: allAccessLogs.length > 0 
        ? allAccessLogs[0].timestamp.toISOString() 
        : null,
      // Now reason exists on the type
      suspiciousAttempts: allAccessLogs.filter(
        l => l.status === 'BLOCKED' && l.reason && l.reason.includes('suspicious')
      ).length,
    };

    const response: AccessLogResponse = {
      success: true,
      data: {
        reviewLink: {
          id: reviewLink.id,
          token: reviewLink.token,
          conceptId: reviewLink.conceptId,
          conceptName: reviewLink.concept.name,
          clientId: reviewLink.clientId,
          clientName: reviewLink.client.clientName,
          createdAt: reviewLink.createdAt.toISOString(),
          expiresAt: reviewLink.expiresAt?.toISOString() || null,
          isActive: reviewLink.isActive,
          viewCount: reviewLink.viewCount,
          maxViews: reviewLink.maxViews || 0,
        },
        logs,
        summary,
        pagination: {
          page,
          limit,
          total: allLogs.length,
          pages: Math.ceil(allLogs.length / limit),
        },
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching access logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access logs: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ─── POST Handler - Block an IP ────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;
    const body = await req.json();
    const { ipAddress, reason, blockDuration } = body;

    if (!ipAddress) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }

    const reviewLink = await prisma.reviewLink.findFirst({
      where: {
        token,
        agencyId: session.user.agencyId,
      },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: 'Review link not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.auditLog.create({
      data: {
        action: 'ALERT',
        entityType: 'ReviewLink',
        entityId: reviewLink.id,
        message: `IP ${ipAddress} blocked from accessing review link`,
        metadata: {
          ipAddress,
          reason: reason || 'Manual block',
          blockDuration: blockDuration || 'permanent',
          status: 'BLOCKED',
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    let reviewNotes: any = {};
    if (reviewLink.reviewNotes) {
      try {
        reviewNotes = JSON.parse(reviewLink.reviewNotes);
      } catch {
        // Ignore parsing errors
      }
    }

    if (!reviewNotes.blockedIPs) {
      reviewNotes.blockedIPs = [];
    }

    if (!reviewNotes.blockedIPs.includes(ipAddress)) {
      reviewNotes.blockedIPs.push(ipAddress);
      reviewNotes.blockedIPsTimestamps = reviewNotes.blockedIPsTimestamps || {};
      reviewNotes.blockedIPsTimestamps[ipAddress] = new Date().toISOString();
      reviewNotes.blockedIPsReasons = reviewNotes.blockedIPsReasons || {};
      reviewNotes.blockedIPsReasons[ipAddress] = reason || 'Manual block';

      await prisma.reviewLink.update({
        where: { id: reviewLink.id },
        data: {
          reviewNotes: JSON.stringify(reviewNotes),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `IP ${ipAddress} blocked successfully`,
      ipAddress,
      reason: reason || 'Manual block',
      blockedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error blocking IP:', error);
    return NextResponse.json(
      { error: 'Failed to block IP: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ─── DELETE Handler - Unblock an IP ────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;
    const url = new URL(req.url);
    const ipAddress = url.searchParams.get('ipAddress');

    if (!ipAddress) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }

    const reviewLink = await prisma.reviewLink.findFirst({
      where: {
        token,
        agencyId: session.user.agencyId,
      },
    });

    if (!reviewLink) {
      return NextResponse.json(
        { error: 'Review link not found or unauthorized' },
        { status: 404 }
      );
    }

    let reviewNotes: any = {};
    if (reviewLink.reviewNotes) {
      try {
        reviewNotes = JSON.parse(reviewLink.reviewNotes);
      } catch {
        // Ignore parsing errors
      }
    }

    if (reviewNotes.blockedIPs) {
      reviewNotes.blockedIPs = reviewNotes.blockedIPs.filter((ip: string) => ip !== ipAddress);
      if (reviewNotes.blockedIPsTimestamps) {
        delete reviewNotes.blockedIPsTimestamps[ipAddress];
      }
      if (reviewNotes.blockedIPsReasons) {
        delete reviewNotes.blockedIPsReasons[ipAddress];
      }

      await prisma.reviewLink.update({
        where: { id: reviewLink.id },
        data: {
          reviewNotes: JSON.stringify(reviewNotes),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'ReviewLink',
        entityId: reviewLink.id,
        message: `IP ${ipAddress} unblocked from accessing review link`,
        metadata: {
          ipAddress,
          action: 'UNBLOCK',
        },
        agencyId: session.user.agencyId,
        actorId: session.user.id || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      message: `IP ${ipAddress} unblocked successfully`,
    });

  } catch (error) {
    console.error('Error unblocking IP:', error);
    return NextResponse.json(
      { error: 'Failed to unblock IP: ' + (error as Error).message },
      { status: 500 }
    );
  }
}