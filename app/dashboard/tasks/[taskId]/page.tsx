// app/dashboard/tasks/[taskId]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { TaskDetailClient } from "@/components/tasks/TaskDetailClient";

interface PageProps {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const { taskId } = await params;
  
  // ─── Fetch task data ──────────────────────────────────────────────────────────
  const task = await db.task.findFirst({
    where: {
      id: taskId,
      agencyId: session.user.agencyId,
      deletedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          projectName: true,
          client: {
            select: {
              id: true,
              clientName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      milestone: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          deadline: true,
          order: true,
          tasks: {
            where: { deletedAt: null },
            select: { progress: true }
          }
        },
      },
      assignees: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      },
      assets: {
        select: {
          id: true,
          assetName: true,
          assetNo: true,
          availabilityStatus: true,
        },
      },
      dependsOn: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      dependents: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      comments: {
        select: {
          id: true,
          text: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          commentMentions: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      todos: {
        select: {
          id: true,
          text: true,
          completed: true,
          priority: true,
          dueDate: true,
        },
        orderBy: { createdAt: "asc" },
      },
      plannedExpenses: {
        select: {
          id: true,
          itemName: true,
          category: true,
          quantity: true,
          unitCost: true,
          taxRate: true,
          totalEstimated: true,
          status: true,
        },
        orderBy: { createdAt: "asc" },
      },
      taskExpenses: {
        select: {
          id: true,
          itemName: true,
          cost: true,
          category: true,
          status: true,
          reimbursable: true,
          incurredAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          comments: true,
          todos: true,
          attachments: true,
        },
      },
    },
  });

  if (!task) {
    return notFound();
  }

  // ✅ Fetch concepts for this task to pass to the reviews tab
 const taskConcepts = await db.concept.findMany({
  where: {
    taskId: taskId,
    agencyId: session.user.agencyId,
  },
  include: {
    assets: {
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    },
    reviewLinks: {
      where: { isActive: true },
      select: {
        id: true,
        token: true,
        status: true,
        isActive: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});
  // Calculate milestone progress from tasks
  let milestoneProgress = 0;
  if (task.milestone && task.milestone.tasks) {
    const totalProgress = task.milestone.tasks.reduce((sum, t) => sum + t.progress, 0);
    milestoneProgress = task.milestone.tasks.length > 0 
      ? Math.round(totalProgress / task.milestone.tasks.length) 
      : 0;
  }

  // Calculate task progress from todos
  let taskProgress = task.progress;
  if (task.todos && task.todos.length > 0) {
    const completedCount = task.todos.filter(todo => todo.completed).length;
    taskProgress = Math.round((completedCount / task.todos.length) * 100);
  }

  // Convert dates to strings for serialization
  const serializedTask = {
    ...task,
    progress: taskProgress,
    milestone: task.milestone ? {
      ...task.milestone,
      progress: milestoneProgress,
      tasks: undefined,
    } : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    startDate: task.startDate ? task.startDate.toISOString() : null,
    endDate: task.endDate ? task.endDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };

  return <TaskDetailClient taskId={taskId} initialTask={serializedTask} taskConcepts={taskConcepts} />;
}