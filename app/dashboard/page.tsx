// Inside your app/dashboard/page.tsx (Server Component)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import EmployeeDashboard from "../../components/main/EmployeeDashboard";

export default async function Page() {
  const session = await getServerSession(authOptions);
  
  // Pass the user from the session to the client component
  return <EmployeeDashboard user={session?.user} />;
}