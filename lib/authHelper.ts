// lib/authHelper.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";

export interface AuthenticatedSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    agencyId: string;
  };
}

class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Ensures the request is authenticated and has an active agencyId attached.
 * Returns the typed session or throws a structured AuthError.
 */
export async function getSessionOrThrow(): Promise<AuthenticatedSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new AuthError("Unauthorized", 401);
  }

  if (!session.user.agencyId) {
    throw new AuthError("Forbidden: Workspace/Agency not assigned", 403);
  }

  return session as AuthenticatedSession;
}

/**
 * Standardized wrapper for Next.js Route Handlers to eliminate repetitive try/catch boilerplate.
 */
export function withApiAuth(
  handler: (session: AuthenticatedSession, req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      const session = await getSessionOrThrow();
      return await handler(session, req);
    } catch (err: any) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("API Error:", err);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}