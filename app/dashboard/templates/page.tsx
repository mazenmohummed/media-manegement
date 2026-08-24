import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { Plus, FileText, Layers, ArrowUpRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TemplateType } from "@prisma/client";

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;

  const templates = await db.projectTemplate.findMany({
    where: { agencyId },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const typeLabels: Record<TemplateType, string> = {
    PROJECT: "Project Blueprint",
    TASK: "Task Blueprint",
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">
            Project Templates
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Reusable milestone and task blueprints. Build once, deploy many.
          </p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </Link>
      </div>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/dashboard/templates/${template.id}`}
              className="group bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all space-y-3 block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-100 truncate group-hover:text-purple-300 transition-colors">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                      {template.description}
                    </p>
                  )}
                </div>
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 shrink-0 text-[10px]">
                  {typeLabels[template.type]}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  {template._count.items} item
                  {template._count.items !== 1 ? "s" : ""}
                </span>
                {template.serviceType && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    {template.serviceType}
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  Updated {new Date(template.updatedAt).toLocaleDateString()}
                </span>
                <span className="text-purple-400 flex items-center gap-1 group-hover:underline">
                  Edit <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-200 font-medium">No templates yet</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Create a template to standardize your agency's project delivery.
          </p>
        </div>
      )}
    </div>
  );
}