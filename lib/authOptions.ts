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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("--> Auth Failed: Missing email or password");
          return null;
        }

        const normalizedEmail = credentials.email.trim();

        // Query case-insensitively so "Mazen@..." and "mazen@..." both match
        const user = await db.user.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: "insensitive",
            },
          },
        });

        if (!user) {
          console.log(`--> Auth Failed: User not found for email ${normalizedEmail}`);
          return null;
        }

        if (!user.password) {
          console.log("--> Auth Failed: Password null in database");
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          console.log("--> Auth Failed: Password hash mismatch (bcrypt.compare failed)");
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          agencyId: user.agencyId ?? null,
          clientId: user.clientId ?? null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.agencyId = user.agencyId ?? null;
        token.clientId = user.clientId ?? null;

        if (user.email?.toLowerCase().trim() === "mazn39998@gmail.com") {
          token.role = UserRole.SUPERADMIN;
        } else {
          token.role = user.role;
        }
      }

      if (trigger === "update" && session) {
        if (session.agencyId !== undefined) token.agencyId = session.agencyId;
        if (session.agencyName !== undefined) token.agencyName = session.agencyName;
        if (session.clientId !== undefined) token.clientId = session.clientId;
        if (session.role) token.role = session.role;
      }

      if (token.agencyId && !token.agencyName) {
        const agency = await db.agency.findUnique({
          where: { id: token.agencyId },
          select: { agencyName: true },
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
        session.user.clientId = token.clientId ?? null;
        session.user.role = token.role;
      }
      return session;
    },
  },
};