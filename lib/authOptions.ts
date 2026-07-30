import { NextAuthOptions, DefaultSession } from "next-auth";
import { db } from "@/lib/db"; 
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      agencyId: string;
      agencyName?: string | null;
      role: UserRole | "SUPERADMIN";
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    agencyId: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    agencyId: string;
    agencyName: string | null;
    role: UserRole | "SUPERADMIN";
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { 
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (isPasswordValid) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            agencyId: user.agencyId,
            role: user.role,
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.agencyId = user.agencyId;
        
        if (user.email === "mazn39998@gmail.com") {
          token.role = "SUPERADMIN";
        } else {
          token.role = user.role as UserRole;
        }
      }

      if (trigger === "update" && session) {
        if (session.agencyId) token.agencyId = session.agencyId;
        if (session.agencyName) token.agencyName = session.agencyName;
        if (session.role) token.role = session.role;
      }

      if (token.agencyId && !token.agencyName) {
        const agency = await db.agency.findUnique({
          where: { id: token.agencyId },
          select: { agencyName: true }
        });
        
        token.agencyName = agency?.agencyName ?? null;
      } else if (token.role === "SUPERADMIN" && !token.agencyName) {
        token.agencyName = "Global Command";
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.agencyId = token.agencyId;
        session.user.agencyName = token.agencyName;
        session.user.role = token.role;
      }
      return session;
    }
  },
};