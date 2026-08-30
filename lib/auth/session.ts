// lib/auth/session.ts
import { headers } from "next/headers";

export interface SessionUser {
  userId: string;
  agencyId: string;
  role: string;
}

export interface Session {
  user: SessionUser;
}

export async function getSession(): Promise<Session | null> {
  try {
    const headersList = await headers();
    
    const userId = headersList.get("x-user-id");
    const agencyId = headersList.get("x-agency-id");
    const role = headersList.get("x-user-role");

    if (!userId || !agencyId) {
      return null;
    }

    return {
      user: {
        userId,
        agencyId,
        role: role || "CREATIVE",
      },
    };
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }
  
  return session;
}

export async function requireAgencyId(): Promise<string> {
  const session = await requireSession();
  
  if (!session.user.agencyId) {
    throw new Error("No agency associated with this user");
  }
  
  return session.user.agencyId;
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.userId || null;
}

export async function getAgencyId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.agencyId || null;
}

export async function getUserRole(): Promise<string | null> {
  const session = await getSession();
  return session?.user.role || null;
}