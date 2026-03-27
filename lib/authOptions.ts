import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db"; 
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

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
      // 1. INITIAL SIGN-IN & SUPERADMIN ELEVATION
      if (user) {
        token.id = user.id;
        token.agencyId = user.agencyId;
        
        // --- MAZEN'S SUPERADMIN CHECK ---
        // Change "mazen@example.com" to your actual email
        if (user.email === "mazn39998@gmail.com") {
          token.role = "SUPERADMIN";
        } else {
          token.role = user.role;
        }
      }

      // 2. CLIENT-SIDE UPDATES (Onboarding/Settings)
      if (trigger === "update" && session) {
        if (session.agencyId) token.agencyId = session.agencyId;
        if (session.agencyName) token.agencyName = session.agencyName;
        if (session.role) token.role = session.role;
      }

      // 3. PERSISTENCE & AGENCY NAME LOOKUP
      // Only lookup agency name if they aren't a Superadmin (or if you want a system name)
      if (token.agencyId && !token.agencyName) {
        const agency = await db.agency.findUnique({
          where: { id: token.agencyId as string },
          select: { agencyName: true }
        });
        token.agencyName = agency?.agencyName || "System Infrastructure";
      } else if (token.role === "SUPERADMIN" && !token.agencyName) {
        token.agencyName = "Global Command";
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.agencyId = token.agencyId as string;
        session.user.agencyName = token.agencyName as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
};