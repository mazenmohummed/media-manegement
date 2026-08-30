// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import EmployeeDashboard from "@/components/main/EmployeeDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  return <EmployeeDashboard user={session?.user} />;
}