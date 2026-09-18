// app/dashboard/employees/new/page.tsx
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewEmployeeForm } from '@/components/employees/NewEmployeeForm';

export default async function NewEmployeePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;

  // ─── Fetch everything we need in parallel ─────────────────────────
  const [departments, subscription, currentUserCount, agency] =
    await Promise.all([
      db.department.findMany({
        where: { agencyId, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.subscription.findUnique({
        where: { agencyId },
        select: { maxUsers: true },
      }),
      db.user.count({
        where: { agencyId, deletedAt: null },
      }),
      db.agency.findUnique({
        where: { id: agencyId },
        select: { defaultCurrency: true },
      }),
    ]);

  const maxUsers = subscription?.maxUsers ?? 5;
  const canAddUser = currentUserCount < maxUsers;
  const currency = agency?.defaultCurrency || 'EGP';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/employees"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Add New Employee</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new user account for your agency.
          {!canAddUser && (
            <span className="text-red-600 dark:text-red-400 ml-2">
              (User limit reached: {currentUserCount}/{maxUsers})
            </span>
          )}
        </p>
      </div>

      {!canAddUser ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200 font-medium">
            You&apos;ve reached the maximum number of users for your plan.
          </p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            Upgrade your subscription to add more team members.
          </p>
        </div>
      ) : (
        <NewEmployeeForm
          departments={departments}
          agencyCurrency={currency}
        />
      )}
    </div>
  );
}