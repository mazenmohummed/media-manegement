import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { TaskWorkspace } from "./task-workspace";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectTasksPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      projectName: true,
      name: true,
      status: true,
      currency: true,
      client: { select: { clientName: true } },
      milestones: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          order: true,
          deadline: true,
          status: true,
          budget: true,
          tasks: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              taskNo: true,
              title: true,
              status: true,
              priority: true,
              progress: true,
              dueDate: true,
              estimatedHours: true,
              actualHours: true,
              assignees: { select: { id: true, name: true, avatarUrl: true } },
              category: { select: { name: true } },
            },
          },
        },
      },
      tasks: {
        where: { milestoneId: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          taskNo: true,
          title: true,
          status: true,
          priority: true,
          progress: true,
          dueDate: true,
          estimatedHours: true,
          actualHours: true,
          assignees: { select: { id: true, name: true, avatarUrl: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!project) return notFound();

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-400" />
              {project.projectName || project.name}
            </h1>
            <p className="text-xs text-zinc-500">
              {project.client?.clientName} · {project.status}
            </p>
          </div>
        </div>
      </div>

      <TaskWorkspace
        milestones={project.milestones}
        unassignedTasks={project.tasks}
        projectId={projectId}
        projectCurrency={project.currency}
      />
    </div>
  );
}