import { NextAuthOptions, DefaultSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db"; 
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

// --- TYPESCRIPT AUGMENTATION ---
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
    agencyName: string | null; // This now matches Session perfectly
    role: UserRole | "SUPERADMIN";
  }
}

// --- CONFIGURATION ---
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
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
      // 1. Initial Sign-in logic
      if (user) {
        token.id = user.id;
        token.agencyId = user.agencyId;
        
        // Superadmin check for Mazen
        if (user.email === "mazn39998@gmail.com") {
          token.role = "SUPERADMIN";
        } else {
          token.role = user.role as UserRole;
        }
      }

      // 2. Handle Client Updates
      if (trigger === "update" && session) {
        if (session.agencyId) token.agencyId = session.agencyId;
        if (session.agencyName) token.agencyName = session.agencyName;
        if (session.role) token.role = session.role;
      }

      // 3. Agency Name lookup logic (Database fetch)
      if (token.agencyId && !token.agencyName) {
        const agency = await db.agency.findUnique({
          where: { id: token.agencyId },
          select: { agencyName: true }
        });
        
        // Ensure we provide a string or null, never 'undefined' 
        // to avoid triggering type modifier conflicts
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