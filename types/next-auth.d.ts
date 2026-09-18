// types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      agencyId?: string | null;
      agencyName?: string | null;
      clientId?: string | null;
      role?: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    agencyId?: string | null;
    clientId?: string | null;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    agencyId?: string | null;
    agencyName?: string | null;
    clientId?: string | null;
    role?: UserRole;
  }
}