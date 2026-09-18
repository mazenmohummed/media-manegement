// lib/services/review-link-security.service.ts
import { prisma } from '@/lib/prisma';

export class ReviewLinkSecurityService {
  /**
   * Validate if a client can access a review link
   */
  async validateAccess(token: string, clientId: string): Promise<boolean> {
    try {
      // Find the review link with the given token
      const reviewLink = await prisma.reviewLink.findUnique({
        where: { token },
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
            },
          },
        },
      });

      // If link doesn't exist, access denied
      if (!reviewLink) {
        console.log(`❌ Review link not found: ${token}`);
        return false;
      }

      // Check if link belongs to the client
      if (reviewLink.clientId !== clientId) {
        console.log(`❌ Client ${clientId} does not own link ${token}`);
        return false;
      }

      // Check if link is active
      if (!reviewLink.isActive) {
        console.log(`❌ Review link is inactive: ${token}`);
        return false;
      }

      // Check if link is expired
      if (reviewLink.expiresAt && new Date() > reviewLink.expiresAt) {
        console.log(`❌ Review link expired: ${token}`);
        return false;
      }

      // Check if view limit has been reached
      if (reviewLink.maxViews && reviewLink.viewCount >= reviewLink.maxViews) {
        console.log(`❌ Review link view limit reached: ${token}`);
        return false;
      }

      // Update view count
      await prisma.reviewLink.update({
        where: { id: reviewLink.id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      // Log access attempt
      await prisma.auditLog.create({
        data: {
          action: 'VIEW',
          entityType: 'ReviewLink',
          entityId: reviewLink.id,
          message: `Client ${clientId} accessed review link ${token}`,
          metadata: {
            clientId,
            viewCount: reviewLink.viewCount + 1,
            maxViews: reviewLink.maxViews,
          },
          agencyId: reviewLink.agencyId,
          actorId: 'system',
        },
      });

      console.log(`✅ Review link access granted for ${token}`);
      return true;

    } catch (error) {
      console.error('Error validating review link access:', error);
      return false;
    }
  }

  /**
   * Revoke access to a review link
   */
  async revokeAccess(token: string): Promise<boolean> {
    try {
      // Find the review link
      const reviewLink = await prisma.reviewLink.findUnique({
        where: { token },
        select: {
          id: true,
          agencyId: true,
          isActive: true,
        },
      });

      if (!reviewLink) {
        console.log(`❌ Review link not found: ${token}`);
        return false;
      }

      if (!reviewLink.isActive) {
        console.log(`⚠️ Review link already revoked: ${token}`);
        return true; // Already revoked, consider it a success
      }

      // Revoke the link
      await prisma.reviewLink.update({
        where: { id: reviewLink.id },
        data: {
          isActive: false,
          status: 'REVOKED',
        },
      });

      // Log the revocation
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'ReviewLink',
          entityId: reviewLink.id,
          message: `Review link ${token} revoked`,
          metadata: {
            token,
            reason: 'Manual revocation',
          },
          agencyId: reviewLink.agencyId,
          actorId: 'system',
        },
      });

      console.log(`✅ Review link revoked: ${token}`);
      return true;

    } catch (error) {
      console.error('Error revoking review link:', error);
      return false;
    }
  }

  /**
   * Check if a review link is valid without incrementing view count
   */
  async checkLinkValidity(token: string): Promise<{
    valid: boolean;
    reason?: string;
    link?: any;
  }> {
    try {
      const reviewLink = await prisma.reviewLink.findUnique({
        where: { token },
        include: {
          concept: {
            select: {
              id: true,
              name: true,
              projectId: true,
            },
          },
        },
      });

      if (!reviewLink) {
        return { valid: false, reason: 'Link not found' };
      }

      if (!reviewLink.isActive) {
        return { valid: false, reason: 'Link is inactive' };
      }

      if (reviewLink.expiresAt && new Date() > reviewLink.expiresAt) {
        return { valid: false, reason: 'Link has expired' };
      }

      if (reviewLink.maxViews && reviewLink.viewCount >= reviewLink.maxViews) {
        return { valid: false, reason: 'View limit reached' };
      }

      return { valid: true, link: reviewLink };

    } catch (error) {
      console.error('Error checking link validity:', error);
      return { valid: false, reason: 'Error checking link' };
    }
  }

  /**
   * Get review link details with access status
   */
  async getLinkDetails(token: string, clientId: string): Promise<{
    exists: boolean;
    accessible: boolean;
    link?: any;
    reason?: string;
  }> {
    try {
      const isValid = await this.validateAccess(token, clientId);
      const link = await prisma.reviewLink.findUnique({
        where: { token },
        include: {
          concept: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          reviewLinkAssetApprovals: {
            include: {
              creativeAsset: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  thumbnailUrl: true,
                },
              },
              creativeAssetVersion: {
                select: {
                  id: true,
                  versionNo: true,
                  fileUrl: true,
                },
              },
            },
          },
        },
      });

      if (!link) {
        return { exists: false, accessible: false, reason: 'Link not found' };
      }

      return {
        exists: true,
        accessible: isValid,
        link,
        reason: isValid ? undefined : 'Access denied',
      };

    } catch (error) {
      console.error('Error getting link details:', error);
      return {
        exists: false,
        accessible: false,
        reason: 'Error retrieving link',
      };
    }
  }

  /**
   * Generate a secure token for review link
   */
  generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get access statistics for a link
   */
  async getAccessStats(token: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    lastViewedAt: Date | null;
    isExpired: boolean;
    viewsRemaining: number | null;
  } | null> {
    try {
      const reviewLink = await prisma.reviewLink.findUnique({
        where: { token },
        select: {
          viewCount: true,
          maxViews: true,
          expiresAt: true,
          isActive: true,
          updatedAt: true,
          reviewLinkAssetApprovals: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!reviewLink) {
        return null;
      }

      const isExpired = reviewLink.expiresAt 
        ? new Date() > reviewLink.expiresAt || !reviewLink.isActive
        : !reviewLink.isActive;

      const viewsRemaining = reviewLink.maxViews 
        ? Math.max(0, reviewLink.maxViews - reviewLink.viewCount)
        : null;

      // Count unique viewers (simplified - in production you'd track this separately)
      const uniqueViewers = reviewLink.reviewLinkAssetApprovals.length || 0;

      return {
        totalViews: reviewLink.viewCount,
        uniqueViewers,
        lastViewedAt: reviewLink.updatedAt,
        isExpired,
        viewsRemaining,
      };

    } catch (error) {
      console.error('Error getting access stats:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const reviewLinkSecurityService = new ReviewLinkSecurityService();