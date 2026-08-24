import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { Plus, Building2, ArrowLeft, Users, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DepartmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const departments = await db.department.findMany({
    where: { agencyId: session.user.agencyId },
    include: {
      _count: {
        select: { users: true, taskCategories: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <Link
          href="/dashboard/departments/new"
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-purple-950/20"
        >
          <Plus className="w-4 h-4" /> New Department
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-purple-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Departments</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Organize your agency into departments. Each department can have team
          members and task categories assigned to it.
        </p>
      </div>

      {departments.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <Building2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 font-medium">
            No departments yet.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Create your first department to start organizing your team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {departments.map((dept) => (
            <Link
              key={dept.id}
              href={`/dashboard/departments/${dept.id}`}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-200 truncate">
                    {dept.name}
                  </h3>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                  <Users className="w-3 h-3 mr-1" />
                  {dept._count.users} members
                </Badge>
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                  <Tag className="w-3 h-3 mr-1" />
                  {dept._count.taskCategories} categories
                </Badge>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-600">
                <span>
                  Created {new Date(dept.createdAt).toLocaleDateString()}
                </span>
                <span className="font-mono">{dept.id.slice(0, 8)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}