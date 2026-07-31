import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      agencyId: string;
      agencyName?: string;
      role: string;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the `authorize` callback or database adapters
   */
  interface User {
    id: string;
    agencyId?: string;
    agencyName?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken` when using JWT sessions */
  interface JWT {
    id: string;
    agencyId?: string;
    agencyName?: string;
    role?: string;
  }
}