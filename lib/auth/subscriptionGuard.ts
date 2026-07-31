import basePrisma from "@/lib/prisma";
import { SubscriptionPlan } from "@prisma/client";

export type ResourceType = "users" | "projects";

export interface QuotaCheckResult {
  allowed: boolean;
  error?: string;
  limit?: number;
  currentCount?: number;
  plan?: SubscriptionPlan;
}

// Fallback limits if no subscription record exists for an agency
const DEFAULT_LIMITS = {
  maxUsers: 5,
  maxProjects: 50,
};

/**
 * Checks if an agency has reached its subscription plan limit for a given resource.
 */
export async function checkQuotaGuard(
  agencyId: string,
  resource: ResourceType
): Promise<QuotaCheckResult> {
  const agency = await basePrisma.agency.findUnique({
    where: { id: agencyId },
    include: {
      subscription: true,
      _count: {
        select: {
          users: true,
          projects: true,
        },
      },
    },
  });

  if (!agency) {
    return { allowed: false, error: "Agency context not found." };
  }

  const plan = agency.subscription?.plan ?? SubscriptionPlan.FREE;
  const maxUsers = agency.subscription?.maxUsers ?? DEFAULT_LIMITS.maxUsers;
  const maxProjects = agency.subscription?.maxProjects ?? DEFAULT_LIMITS.maxProjects;

  if (resource === "users") {
    const currentCount = agency._count.users;
    if (currentCount >= maxUsers) {
      return {
        allowed: false,
        plan,
        limit: maxUsers,
        currentCount,
        error: `User seat limit reached (${currentCount}/${maxUsers}). Please upgrade your '${plan}' subscription plan to invite or add more users.`,
      };
    }
  }

  if (resource === "projects") {
    const currentCount = agency._count.projects;
    if (currentCount >= maxProjects) {
      return {
        allowed: false,
        plan,
        limit: maxProjects,
        currentCount,
        error: `Project limit reached (${currentCount}/${maxProjects}). Please upgrade your '${plan}' subscription plan to create new projects.`,
      };
    }
  }

  return { allowed: true };
}