// lib/authOptions.ts

import { NextAuthOptions, DefaultSession } from "next-auth";
import { db } from "@/lib/db"; 
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

// Module Augmentation using pure UserRole from Prisma
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      agencyId?: string | null;
      agencyName?: string | null;
      role?: UserRole; // 🟢 Directly uses your Prisma enum
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    agencyId?: string | null;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    agencyId?: string | null;
    agencyName?: string | null;
    role?: UserRole; // 🟢 Optional modifier matches NextAuth's internal JWT type
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

        const normalizedEmail = credentials.email.toLowerCase().trim();

        const user = await db.user.findUnique({
          where: { email: normalizedEmail }
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (isPasswordValid) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            agencyId: user.agencyId ?? null,
            role: user.role, // Pure UserRole enum value from DB
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
        token.agencyId = user.agencyId ?? null;
        
        // Dynamic SUPERADMIN override for master account
        if (user.email?.toLowerCase().trim() === "mazn39998@gmail.com") {
          token.role = UserRole.SUPERADMIN;
        } else {
          token.role = user.role;
        }
      }

      if (trigger === "update" && session) {
        if (session.agencyId !== undefined) token.agencyId = session.agencyId;
        if (session.agencyName !== undefined) token.agencyName = session.agencyName;
        if (session.role) token.role = session.role;
      }

      if (token.agencyId && !token.agencyName) {
        const agency = await db.agency.findUnique({
          where: { id: token.agencyId },
          select: { agencyName: true }
        });
        
        token.agencyName = agency?.agencyName ?? null;
      } else if (token.role === UserRole.SUPERADMIN && !token.agencyName) {
        token.agencyName = "Global Command";
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.agencyId = token.agencyId ?? null;
        session.user.agencyName = token.agencyName ?? null;
        session.user.role = token.role;
      }
      return session;
    }
  },
};