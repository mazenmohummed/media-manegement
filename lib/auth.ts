import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  // Because of your callbacks, session.user now includes id and agencyId
  return session.user as {
    id: string;
    name: string;
    email: string;
    agencyId: string;
    role: string;
  };
}