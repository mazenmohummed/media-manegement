// components/tasks/TaskDetailClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertCircle,
  Tag,
  MessageSquare,
  ListChecks,
  GitBranch,
  BarChart3,
  DollarSign,
  Edit3,
  Loader2,
  Receipt,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskLocationForm } from "@/components/tasks/TaskLocationForm";
import { TaskWorkSession } from "@/components/tasks/TaskWorkSession";
import TaskPlannedExpensesManager from "@/components/tasks/TaskPlannedExpensesManager";
import { TaskExpensesManager } from "@/components/tasks/TaskExpensesManager";
import { OverviewTab } from "@/components/tasks/OverviewTab";
import { CommentsTab } from "@/components/tasks/CommentsTab";
import { TodosTab } from "@/components/tasks/TodosTab";
import { DependenciesTab } from "@/components/tasks/DependenciesTab";
import { AssigneesCard } from "@/components/tasks/AssigneesCard";
import { AssetsCard } from "@/components/tasks/AssetsCard";
import { StatusCard } from "@/components/tasks/StatusCard";
import { DatesCard } from "@/components/tasks/DatesCard";
import { ClientCard } from "@/components/tasks/ClientCard";
import { ProgressIndicator } from "@/components/tasks/ProgressIndicator";
import { ProcurementChainStatus } from "@/components/procurement/ProcurementChainStatus";
import { ProcurementChainWidget } from "@/components/procurement/ProcurementChainWidget";
import { TaskDetail } from "@/types/task";
import { TaskReviewsTab } from '@/components/tasks/TaskReviewsTab';
import { TaskConceptsTab } from './TaskConceptsTab';

interface TaskDetailClientProps {
  taskId: string;
  initialTask: any;
  taskConcepts?: Array<{ id: string; name: string }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  ACTIVE: { label: "Active", color: "bg-blue-950/40 text-blue-400 border-blue-800" },
  IN_REVIEW: { label: "In Review", color: "bg-amber-950/40 text-amber-400 border-amber-800" },
  COMPLETED: { label: "Completed", color: "bg-emerald-950/40 text-emerald-400 border-emerald-800" },
  CANCELLED: { label: "Cancelled", color: "bg-red-950/40 text-red-400 border-red-800" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  MEDIUM: { label: "Medium", color: "bg-blue-950/30 text-blue-400 border-blue-800" },
  HIGH: { label: "High", color: "bg-orange-950/30 text-orange-400 border-orange-800" },
  URGENT: { label: "Urgent", color: "bg-red-950/30 text-red-400 border-red-800" },
};

export function TaskDetailClient({ taskId, initialTask, taskConcepts = [] }: TaskDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [task, setTask] = useState<any>(initialTask);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  const fetchTask = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch (err) {
      console.error("Failed to fetch task:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const updateTask = async (updates: Partial<any>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Update failed:", err);
      return false;
    }
  };

  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  const hasProcurement = task.plannedExpenses?.length > 0 || 
                         task.quotations?.length > 0 || 
                         task.purchaseOrders?.length > 0;

  // ✅ Define tabs with reviews tab
  const tabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "comments", label: `Comments (${task._count?.comments || 0})`, icon: MessageSquare },
    { key: "todos", label: `Todos (${task._count?.todos || 0})`, icon: ListChecks },
    { key: "dependencies", label: "Dependencies", icon: GitBranch },
    { key: "concepts", label: "Concepts", icon: Lightbulb },
    { key: "planned-expenses", label: "Planned Expenses", icon: DollarSign },
    { key: "task-expenses", label: "Task Expenses", icon: Receipt },
    { key: "reviews", label: "Reviews", icon: MessageSquare },
  ];

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    router.push(`/dashboard/tasks/${taskId}?tab=${tabKey}`, { scroll: false });
  };

  // ✅ Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab task={task} onUpdate={fetchTask} />;
      case "comments":
        return <CommentsTab taskId={taskId} comments={task.comments || []} onUpdate={fetchTask} />;
      case "todos":
        return <TodosTab taskId={taskId} todos={task.todos || []} onUpdate={fetchTask} />;
      case "dependencies":
        return (
          <DependenciesTab
            taskId={taskId}
            dependsOn={task.dependsOn || []}
            dependents={task.dependents || []}
            taskStatus={task.status}
            onUpdate={fetchTask}
          />
        );
     case "concepts":
      return (
        <TaskConceptsTab 
          taskId={taskId} 
          projectId={task.project?.id || task.projectId} 
          // ✅ Remove initialConcepts - let the component fetch its own data
          onUpdate={fetchTask}
        />
      );
      case "planned-expenses":
        return <TaskPlannedExpensesManager taskId={taskId} initialExpenses={task.plannedExpenses || []} />;
      case "task-expenses":
        return <TaskExpensesManager taskId={taskId} initialExpenses={task.taskExpenses || []} />;
      case "reviews":
        return <TaskReviewsTab taskId={taskId} taskConcepts={taskConcepts} />;
      default:
        return <OverviewTab task={task} onUpdate={fetchTask} />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center py-20">
        <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500">Task not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Breadcrumb + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tasks"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tasks
          </Link>
          {task.project && (
            <>
              <span className="text-zinc-700">/</span>
              <Link
                href={`/dashboard/projects/${task.project.id}`}
                className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors truncate max-w-[200px]"
              >
                {task.project.name}
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/tasks/${taskId}/budget`}>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-700/60 text-purple-300 hover:bg-purple-950/40"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Budget & Roll-up
            </Button>
          </Link>
          <Link href={`/dashboard/tasks/${taskId}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-zinc-600">{task.taskNo ?? task.id.slice(0, 8)}</span>
              <Badge className={`${status.color} text-[10px] px-1.5 py-0`}>{status.label}</Badge>
              <Badge className={`${priority.color} text-[10px] px-1.5 py-0`}>{priority.label}</Badge>
              {task.category && (
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0">
                  <Tag className="w-2.5 h-2.5 mr-0.5" />
                  {task.category.name}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-zinc-100">{task.title ?? "Untitled Task"}</h1>
          </div>

          {/* Progress */}
          <div className="w-full lg:w-48 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Progress</span>
              <span className="font-mono">{task.progress}%</span>
            </div>
            <ProgressIndicator
              progress={task.progress}
              completedTodos={task.todos ? task.todos.filter((t: any) => t.completed).length : 0}
              totalTodos={task.todos ? task.todos.length : 0}
            />
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500">
          {task.milestone && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-300">{task.milestone.name}</span>
              {task.milestone.progress > 0 && (
                <span className="text-zinc-600">({task.milestone.progress}%)</span>
              )}
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{task.estimatedHours}h estimated</span>
            {task.actualHours > 0 && <span className="text-zinc-600">· {task.actualHours}h actual</span>}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 overflow-x-auto">
            {tabs.map((tabItem) => {
              const isActive = activeTab === tabItem.key;
              return (
                <button
                  key={tabItem.key}
                  onClick={() => handleTabChange(tabItem.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center whitespace-nowrap ${
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <tabItem.icon className="w-3.5 h-3.5" />
                  {tabItem.label}
                </button>
              );
            })}
            <Link
              href={`/dashboard/tasks/${taskId}/budget`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center whitespace-nowrap text-zinc-500 hover:text-zinc-300"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Budget Dashboard
            </Link>
          </div>

          {/* Tab Content */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 min-h-[300px]">
            {renderTabContent()}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Procurement Chain Widget */}
          {hasProcurement && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <ProcurementChainWidget taskIds={[task.id]} />
            </div>
          )}

          {/* Procurement Chain Status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <ProcurementChainStatus taskId={task.id} />
          </div>

          {/* Task Work Session */}
          <TaskWorkSession 
            taskId={task.id} 
            userId={task.assignees?.[0]?.id || ""}
            onUpdate={fetchTask}
          />

          {/* Task Location */}
          <TaskLocationForm
            taskId={taskId}
            initialLocation={{
              locationName: task.locationName,
              latitude: task.latitude,
              longitude: task.longitude,
              radius: task.radius,
            }}
            onUpdate={fetchTask}
          />

          {/* Client Card */}
          {task.project?.client && (
            <ClientCard 
              client={{
                ...task.project.client,
                accountType: "ACTIVE",
              }} 
            />
          )}
          
          {/* Assets Card */}
          <AssetsCard 
            taskId={task.id} 
            assets={task.assets || []} 
            onUpdate={fetchTask}
            taskStartDate={task.startDate}
            taskEndDate={task.endDate}
            taskTitle={task.title}
          />
          
          {/* Assignees Card */}
          <AssigneesCard taskId={taskId} assignees={task.assignees || []} onUpdate={fetchTask} />
          
          {/* Status Card */}
          <StatusCard task={task} onUpdate={updateTask} />
          
          {/* Dates Card */}
          <DatesCard task={task} onUpdate={updateTask} />
        </div>
      </div>
    </div>
  );
}