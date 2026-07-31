// lib/rbac.ts
import { getCurrentUser } from "@/lib/auth";

export async function authorizeAgencyAccess(targetAgencyId: string) {
  const user = await getCurrentUser();

  if (!user || user.agencyId !== targetAgencyId) {
    throw new Error("Forbidden: Access denied to this agency scope.");
  }

  return user;
}