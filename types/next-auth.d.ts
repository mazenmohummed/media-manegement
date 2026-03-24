import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      agencyId: string; // This allows session.user.agencyId
    } & DefaultSession["user"];
  }

  interface User {
    agencyId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    agencyId: string;
  }
}