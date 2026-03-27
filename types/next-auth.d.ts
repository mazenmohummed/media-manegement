// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      agencyId: string;
      agencyName: string;
      role: string;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    agencyId: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    agencyId: string;
    agencyName: string;
    role: string;
  }
}