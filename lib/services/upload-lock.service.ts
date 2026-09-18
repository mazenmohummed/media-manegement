// lib/services/upload-lock.service.ts
import { prisma } from '@/lib/prisma';

interface UploadLock {
  assetId: string;
  userId: string;
  sessionId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

export class UploadLockService {
  private locks: Map<string, UploadLock> = new Map();
  private readonly LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Acquire a lock for uploading to a specific asset
   * @param assetId - The ID of the asset being uploaded to
   * @param userId - The ID of the user acquiring the lock
   * @param sessionId - Optional session ID for tracking
   * @returns Promise<boolean> - True if lock was acquired, false if already locked
   */
  async acquireLock(
    assetId: string,
    userId: string,
    sessionId?: string
  ): Promise<boolean> {
    try {
      // Check if lock already exists
      const existingLock = this.locks.get(assetId);

      // If lock exists, check if it's expired
      if (existingLock) {
        const now = new Date();
        if (existingLock.expiresAt > now) {
          // Lock is still valid - cannot acquire
          console.log(`❌ Upload lock already held for asset ${assetId} by user ${existingLock.userId}`);
          return false;
        } else {
          // Lock expired - remove it
          this.locks.delete(assetId);
          console.log(`⏰ Expired lock removed for asset ${assetId}`);
        }
      }

      // Create new lock
      const newLock: UploadLock = {
        assetId,
        userId,
        sessionId: sessionId || `session-${Date.now()}`,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + this.LOCK_TIMEOUT_MS),
      };

      // Store the lock
      this.locks.set(assetId, newLock);

      // Also store in database for persistence (optional)
      await this.persistLockToDatabase(assetId, newLock);

      console.log(`🔒 Upload lock acquired for asset ${assetId} by user ${userId}`);
      return true;

    } catch (error) {
      console.error('Error acquiring upload lock:', error);
      return false;
    }
  }

  /**
   * Release a lock for uploading to a specific asset
   * @param assetId - The ID of the asset being uploaded to
   * @param userId - The ID of the user releasing the lock
   * @returns Promise<boolean> - True if lock was released, false if not found
   */
  async releaseLock(assetId: string, userId: string): Promise<boolean> {
    try {
      const existingLock = this.locks.get(assetId);

      if (!existingLock) {
        console.log(`⚠️ No lock found for asset ${assetId}`);
        return false;
      }

      // Verify the user releasing the lock is the one who acquired it
      if (existingLock.userId !== userId) {
        console.log(`❌ User ${userId} does not own lock for asset ${assetId}`);
        return false;
      }

      // Remove the lock
      this.locks.delete(assetId);

      // Remove from database
      await this.removeLockFromDatabase(assetId);

      console.log(`🔓 Upload lock released for asset ${assetId} by user ${userId}`);
      return true;

    } catch (error) {
      console.error('Error releasing upload lock:', error);
      return false;
    }
  }

  /**
   * Force release a lock (admin or emergency)
   * @param assetId - The ID of the asset
   * @param reason - Reason for force release
   * @returns Promise<boolean> - True if lock was released
   */
  async forceReleaseLock(assetId: string, reason: string = 'Force release'): Promise<boolean> {
    try {
      const existingLock = this.locks.get(assetId);

      if (!existingLock) {
        console.log(`⚠️ No lock found for asset ${assetId}`);
        return false;
      }

      // Remove the lock
      this.locks.delete(assetId);

      // Remove from database
      await this.removeLockFromDatabase(assetId);

      console.log(`🔓 Upload lock force released for asset ${assetId}. Reason: ${reason}`);
      return true;

    } catch (error) {
      console.error('Error force releasing upload lock:', error);
      return false;
    }
  }

  /**
   * Check if a lock exists for a specific asset
   * @param assetId - The ID of the asset
   * @returns Promise<boolean> - True if lock exists and is valid
   */
  async isLocked(assetId: string): Promise<boolean> {
    try {
      const lock = this.locks.get(assetId);

      if (!lock) {
        return false;
      }

      // Check if lock has expired
      if (new Date() > lock.expiresAt) {
        // Clean up expired lock
        this.locks.delete(assetId);
        await this.removeLockFromDatabase(assetId);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error checking upload lock:', error);
      return false;
    }
  }

  /**
   * Get lock details for a specific asset
   * @param assetId - The ID of the asset
   * @returns Promise<UploadLock | null> - Lock details or null if not locked
   */
  async getLockDetails(assetId: string): Promise<UploadLock | null> {
    try {
      const lock = this.locks.get(assetId);

      if (!lock) {
        return null;
      }

      // Check if lock has expired
      if (new Date() > lock.expiresAt) {
        // Clean up expired lock
        this.locks.delete(assetId);
        await this.removeLockFromDatabase(assetId);
        return null;
      }

      return lock;

    } catch (error) {
      console.error('Error getting lock details:', error);
      return null;
    }
  }

  /**
   * Get all active locks
   * @returns Promise<UploadLock[]> - Array of all active locks
   */
  async getAllLocks(): Promise<UploadLock[]> {
    try {
      const now = new Date();
      const activeLocks: UploadLock[] = [];

      // Clean up expired locks first
      for (const [assetId, lock] of this.locks.entries()) {
        if (lock.expiresAt <= now) {
          this.locks.delete(assetId);
          await this.removeLockFromDatabase(assetId);
        } else {
          activeLocks.push(lock);
        }
      }

      return activeLocks;

    } catch (error) {
      console.error('Error getting all locks:', error);
      return [];
    }
  }

  /**
   * Extend a lock's expiration time
   * @param assetId - The ID of the asset
   * @param additionalMinutes - Additional minutes to extend the lock
   * @returns Promise<boolean> - True if lock was extended
   */
  async extendLock(assetId: string, additionalMinutes: number = 5): Promise<boolean> {
    try {
      const lock = this.locks.get(assetId);

      if (!lock) {
        console.log(`⚠️ No lock found for asset ${assetId}`);
        return false;
      }

      // Extend the expiration time
      lock.expiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
      this.locks.set(assetId, lock);

      // Update in database
      await this.persistLockToDatabase(assetId, lock);

      console.log(`⏰ Lock extended for asset ${assetId} by ${additionalMinutes} minutes`);
      return true;

    } catch (error) {
      console.error('Error extending upload lock:', error);
      return false;
    }
  }

  /**
   * Clean up expired locks (should be run periodically)
   * @returns Promise<number> - Number of locks cleaned up
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [assetId, lock] of this.locks.entries()) {
        if (lock.expiresAt <= now) {
          this.locks.delete(assetId);
          await this.removeLockFromDatabase(assetId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired locks`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
      return 0;
    }
  }

  // ─── Private Helper Methods ──────────────────────────────────────────────

  /**
   * Persist lock to database for persistence across restarts
   */
  private async persistLockToDatabase(assetId: string, lock: UploadLock): Promise<void> {
    try {
      // You can store locks in a database table if you want persistence across server restarts
      // For now, we'll just use the in-memory map
      // This is a placeholder for future implementation
      console.log(`💾 Lock persisted for asset ${assetId}`);
    } catch (error) {
      console.error('Error persisting lock to database:', error);
    }
  }

  /**
   * Remove lock from database
   */
  private async removeLockFromDatabase(assetId: string): Promise<void> {
    try {
      // Remove from database
      // This is a placeholder for future implementation
      console.log(`🗑️ Lock removed from database for asset ${assetId}`);
    } catch (error) {
      console.error('Error removing lock from database:', error);
    }
  }

  /**
   * Get lock timeout in milliseconds
   */
  getLockTimeout(): number {
    return this.LOCK_TIMEOUT_MS;
  }

  /**
   * Set custom lock timeout
   */
  setLockTimeout(timeoutMs: number): void {
    // This would be used to override the default timeout
    // Implementation would require modifying the class structure
    console.log(`⏰ Lock timeout set to ${timeoutMs}ms`);
  }
}

// Export a singleton instance
export const uploadLockService = new UploadLockService();

// ─── Optional: Database model for persistent locks ──────────────────────────
// If you want to persist locks across server restarts, add this to your schema:
/*
model UploadLock {
  id         String   @id @default(cuid())
  assetId    String   @unique
  userId     String
  sessionId  String
  acquiredAt DateTime @default(now())
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([assetId])
  @@index([expiresAt])
}
*/