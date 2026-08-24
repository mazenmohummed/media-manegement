import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { Plus, Tag, Building, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function TaskCategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const categories = await db.taskCategory.findMany({
    where: { agencyId: session.user.agencyId },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { tasks: true, definitions: true, templateItems: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/templates"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Templates
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tasks"
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm border border-zinc-700"
          >
            <CheckCircle2 className="w-4 h-4" /> Tasks
          </Link>
          <Link
            href="/dashboard/task-categories/new"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-purple-950/20"
          >
            <Plus className="w-4 h-4" /> New Category
          </Link>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5 text-purple-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Task Categories</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Categories are used to tag tasks, template items, and recurring
          definitions. Names must be unique per agency.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <Tag className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 font-medium">
            No categories yet.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Create one to start organizing tasks by department or discipline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-200 truncate">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                </div>
                {cat.department && (
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] shrink-0">
                    <Building className="w-3 h-3 mr-1" />
                    {cat.department.name}
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  href={`/dashboard/tasks?categoryId=${cat.id}`}
                  className="text-[10px] text-zinc-500 hover:text-purple-400 transition-colors"
                >
                  {cat._count.tasks} tasks
                </Link>
                <span className="text-zinc-700">·</span>
                <span className="text-[10px] text-zinc-500">
                  {cat._count.definitions} recurring
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-[10px] text-zinc-500">
                  {cat._count.templateItems} templates
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-600">
                <span>
                  Created {new Date(cat.createdAt).toLocaleDateString()}
                </span>
                <span className="font-mono">{cat.id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}