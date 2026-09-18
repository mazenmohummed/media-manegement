// app/dashboard/tasks/[taskId]/edit/page.tsx
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EditTaskForm } from '@/components/tasks/EditTaskForm';

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default async function EditTaskPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) {
    redirect('/login');
  }

  const agencyId = session.user.agencyId;
  const { taskId } = await params;

  if (!taskId) {
    notFound();
  }

  // ─── Fetch task with all needed relations ─────────────────────────
  const task = await db.task.findFirst({
    where: {
      id: taskId,
      agencyId,
      deletedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          projectNo: true,
          currency: true,
          client: { select: { id: true, clientName: true } },
        },
      },
      category: {
        select: { id: true, name: true },
      },
      milestone: {
        select: { id: true, name: true },
      },
      contract: {
        select: { id: true, contractNo: true, name: true },
      },
      assignees: {
        select: { id: true, name: true, role: true, email: true },
      },
      tags: {
        select: { id: true, name: true, color: true },
      },
      dependsOn: {
        select: { id: true, title: true, taskNo: true, status: true },
      },
    },
  });

  if (!task) {
    notFound();
  }

  // ─── Fetch dropdown data in parallel ───────────────────────────────
  const [
    categories,
    milestones,
    assignableUsers,
    tags,
    allAgencyTasks,
  ] = await Promise.all([
    db.taskCategory.findMany({
      where: { agencyId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.milestone.findMany({
      where: {
        projectId: task.projectId,
        deletedAt: null,
      },
      select: { id: true, name: true, status: true },
      orderBy: { order: 'asc' },
    }),
    db.user.findMany({
      where: {
        agencyId,
        deletedAt: null,
        isActive: true,
        role: { in: ['ADMIN', 'OPERATOR', 'TEAMLEADER', 'CREATIVE'] },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    }),
    db.tag.findMany({
      where: { agencyId, deletedAt: null },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    }),
    // Other tasks in the same project (for dependencies)
    db.task.findMany({
      where: {
        projectId: task.projectId,
        agencyId,
        deletedAt: null,
        id: { not: taskId }, // exclude self
      },
      select: {
        id: true,
        title: true,
        taskNo: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  // ─── Serialize dates ───────────────────────────────────────────────
  const serializedTask = {
    id: task.id,
    taskNo: task.taskNo,
    taskType: task.taskType,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    endDate: task.endDate ? task.endDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    locationName: task.locationName,
    latitude: task.latitude,
    longitude: task.longitude,
    radius: task.radius,
    projectId: task.projectId,
    categoryId: task.categoryId,
    milestoneId: task.milestoneId,
    contractId: task.contractId,
    project: {
      id: task.project.id,
      name: task.project.name,
      projectNo: task.project.projectNo,
      currency: task.project.currency,
      client: task.project.client,
    },
    category: task.category,
    milestone: task.milestone,
    contract: task.contract,
    assignees: task.assignees,
    tags: task.tags,
    dependsOn: task.dependsOn,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link
        href={`/dashboard/tasks/${taskId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Task
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Edit Task</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {task.taskNo && (
            <span className="font-mono mr-2">{task.taskNo}</span>
          )}
          in project <span className="font-medium">{task.project.name}</span>
        </p>
      </div>

      <EditTaskForm
        task={serializedTask}
        categories={categories}
        milestones={milestones}
        assignableUsers={assignableUsers}
        availableTags={tags}
        availableDependencies={allAgencyTasks}
        currency={task.project.currency}
      />
    </div>
  );
}