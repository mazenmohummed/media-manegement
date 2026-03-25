import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs"; // 1. Import bcrypt

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
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
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) return null;

        // 2. Use bcrypt to compare the plain text password with the hash
        const isPasswordValid = await bcrypt.compare(
          credentials.password, 
          user.password
        );

       if (isPasswordValid) {
        return {
            id: user.id, // Ensure this field matches your Prisma User model ID
            name: user.name,
            email: user.email,
            agencyId: user.agencyId,
            role: user.role,
        };
        }
                
        // If password doesn't match
        return null;
      }
    })
  ],
 callbacks: {
  async jwt({ token, user }) {
    // This runs on sign-in. 'user' is the object returned from your 'authorize' function.
    if (user) {
      token.id = user.id; // Map the MongoDB/Prisma ID to the token
      token.agencyId = (user as any).agencyId;
      token.role = (user as any).role;
    }
    return token;
  },
  async session({ session, token }) {
    // This runs whenever a session is checked. 'token' is the decrypted JWT.
    if (session.user) {
      (session.user as any).id = token.id as string; // Map token ID back to session
      (session.user as any).agencyId = token.agencyId as string;
      (session.user as any).role = token.role as string;
    }
    return session;
  }
}
};