// app/dashboard/projects/[projectId]/brief/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { BriefView } from "@/components/projects/brief-view";
import Link from "next/link";
import { ArrowLeft, Wand2 } from "lucide-react";

export default async function ProjectBriefPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      brief: true,
    },
  });

  if (!project) return notFound();

  if (!project.brief) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center space-y-4">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </Link>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-4">
          <Wand2 className="w-10 h-10 text-purple-400 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-100">No Creative Brief Found</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            This project does not have a creative brief attached yet. Quick-create one directly from the source Opportunity discovery pipeline page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BriefView
      projectId={project.id}
      projectName={project.name}
      currency={project.currency}
      initialBrief={{
        id: project.brief.id,
        title: project.brief.title,
        status: project.brief.status,
        budget: project.brief.budget,
        objectives: project.brief.objectives,
        audience: project.brief.audience,
        keyMessage: project.brief.keyMessage,
        deliverables: project.brief.deliverables,
        references: project.brief.references,
      }}
    />
  );
}