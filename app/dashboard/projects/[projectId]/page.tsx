import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BarChart3,
  LayoutDashboard,
  ListChecks,
  GitBranch,
  MessageSquare,
  Tag,
  ClipboardList,
  Users,
  FileText,
  PlusCircle,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectStatus } from "@prisma/client";
import { ProjectReportingDashboard } from "@/components/projects/ProjectReportingDashboard";
import { TasksTab } from "@/components/projects/tabs/TasksTab";
import { MilestonesTab } from "@/components/projects/tabs/MilestonesTab";
import { CommentsTab } from "@/components/projects/tabs/CommentsTab";
import { TagsTab } from "@/components/projects/tabs/TagsTab";
import { ConceptsTab } from "@/components/projects/tabs/ConceptsTab";
import { BriefTab } from "@/components/projects/tabs/BriefTab";
import { ProcurementChainStatus } from "@/components/procurement/ProcurementChainStatus";
import { ProcurementChainWidget } from "@/components/procurement/ProcurementChainWidget";

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  // ✅ Get session for authentication
  const session = await getServerSession(authOptions);
  console.log("=== Project Detail Page Debug ===");
  console.log("Session exists:", !!session);
  console.log("AgencyId:", session?.user?.agencyId);
  console.log("User role:", session?.user?.role);

  if (!session?.user?.agencyId) {
    console.log("No agencyId, redirecting to /login");
    redirect("/login");
    return notFound();
  }

  // ✅ Get projectId from params
  const { projectId } = await params;
  const { tab = "overview" } = await searchParams;
  
  console.log("ProjectId:", projectId);

  // ✅ Validate the parameter exists
  if (!projectId) {
    console.error("[ProjectDetailPage] No projectId provided in URL");
    redirect("/dashboard/projects");
    return notFound();
  }

  // ✅ Log the query that will be executed
  const query = {
    where: {
      id: projectId,
      agencyId: session.user.agencyId,
      deletedAt: null,
    },
  };
  console.log("Query:", JSON.stringify(query, null, 2));

  // ✅ Fetch project with security check
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      agencyId: session.user.agencyId,
      deletedAt: null,
    },
    include: {
      client: { 
        select: { 
          id: true, 
          clientName: true, 
          email: true, 
          phoneNumber: true 
        } 
      },
      contract: {
        select: {
          id: true,
          contractNo: true,
          name: true,
          status: true,
          monthlyValue: true,
          currency: true,
        }
      },
      agency: { 
        select: { 
          agencyName: true, 
          defaultCurrency: true 
        } 
      },
      milestones: {
        select: {
          id: true,
          name: true,
          status: true,
          deadline: true,
          budget: true,
          description: true,
          order: true,
        },
        orderBy: { order: "asc" },
        take: 5,
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          taskType: true,
          createdAt: true,
          dueDate: true,
          plannedExpenses: {
            select: {
              id: true,
              itemName: true,
              status: true,
              totalEstimated: true,
            },
          },
          quotations: {
            select: {
              id: true,
              quotationNo: true,
              status: true,
              amount: true,
            },
          },
          assignees: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          tasks: true,
          milestones: true,
          attachments: true,
        },
      },
    },
  });

  console.log("Project found:", !!project);
  if (project) {
    console.log("Project status:", project.status);
    console.log("Project name:", project.name);
  } else {
    console.log("Project NOT found - checking if it exists but is soft-deleted");
    // Check if project exists but is soft-deleted
    const softDeletedProject = await db.project.findFirst({
      where: {
        id: projectId,
        agencyId: session.user.agencyId,
        deletedAt: { not: null },
      },
      select: { id: true, name: true, deletedAt: true },
    });
    if (softDeletedProject) {
      console.log("Project is soft-deleted:", softDeletedProject);
    } else {
      console.log("Project does not exist in this agency at all");
    }
  }

  // ✅ If project doesn't exist, redirect to projects page
  if (!project) {
    console.log("Project not found, redirecting to /dashboard/projects");
    redirect("/dashboard/projects");
    return notFound();
  }

  // ✅ Calculate progress
  const totalTasks = project._count.tasks;
  const completedTasks = project.tasks.filter(t => t.status === "COMPLETED").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ✅ Filter tasks with procurement activity
  const procurementTasks = project.tasks.filter(
    task => task.plannedExpenses.length > 0 || task.quotations.length > 0
  );
  
  // ✅ Get task IDs for procurement widget
  const procurementTaskIds = procurementTasks.map(t => t.id);

  // ✅ Tab configuration
  const tabs = [
    {
      key: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      key: "tasks",
      label: `Tasks (${project._count.tasks})`,
      icon: ListChecks,
    },
    {
      key: "milestones",
      label: `Milestones (${project._count.milestones})`,
      icon: GitBranch,
    },
    {
      key: "concepts",
      label: "Concepts",
      icon: Lightbulb,
    },
    {
      key: "brief",
      label: "Brief",
      icon: FileText,
    },
    {
      key: "reporting",
      label: "Reporting",
      icon: BarChart3,
    },
    {
      key: "comments",
      label: "Comments",
      icon: MessageSquare,
    },
    {
      key: "tags",
      label: `Tags (${project.tags.length})`,
      icon: Tag,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Back Button ───────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      {/* ─── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-zinc-100">
                {project.projectName || project.name}
              </h1>
              <Badge
                className={
                  project.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono"
                    : project.status === "COMPLETED"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 font-mono"
                }
              >
                {project.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-zinc-500" />
              {project.agency.agencyName}
              {project.client?.clientName && (
                <span> → {project.client.clientName}</span>
              )}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/tasks/new?projectId=${project.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Task
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── Quick Metrics ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Value
            </span>
            <p className="text-xl font-bold text-zinc-100 mt-1">
              {project.currency} {project.totalValue?.toLocaleString() ?? "0"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Target Deadline
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {project.targetDeadline
                ? new Date(project.targetDeadline).toLocaleDateString()
                : "Not set"}
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" /> Tasks
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {project._count.tasks} total
            </p>
          </div>

          <div className="bg-zinc-950/60 rounded-lg p-3.5 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Progress
            </span>
            <p className="text-base font-semibold text-zinc-200 mt-1">
              {progress}%
            </p>
          </div>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/60">
            {project.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${tag.color}25`,
                  color: tag.color,
                  border: `1px solid ${tag.color}40`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Tabs Navigation ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tabItem) => {
          const isActive = tab === tabItem.key;
          return (
            <Link
              key={tabItem.key}
              href={`/dashboard/projects/${projectId}?tab=${tabItem.key}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <tabItem.icon className="w-3.5 h-3.5" />
              {tabItem.label}
            </Link>
          );
        })}
      </div>

      {/* ─── Main Content Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Content ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 min-h-[400px]">
            {tab === "overview" && (
              <div className="space-y-6">
                {/* ─── PROCUREMENT CHAIN STATUS ─── */}
                {procurementTasks.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-blue-400" />
                        Procurement Chains
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] ml-2">
                          {procurementTasks.length}
                        </Badge>
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {procurementTasks.map((task) => (
                        <div key={task.id} className="bg-zinc-950/60 p-4 rounded-lg border border-zinc-800/80">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-zinc-200">
                              {task.title || task.taskType || 'Untitled Task'}
                            </p>
                            <Link
                              href={`/dashboard/tasks/${task.id}`}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium uppercase tracking-wider"
                            >
                              View Task →
                            </Link>
                          </div>
                          <div className="space-y-1 mb-3">
                            {task.plannedExpenses.length > 0 && (
                              <p className="text-[10px] text-zinc-400">
                                Planned Expenses: {task.plannedExpenses.length} item(s)
                              </p>
                            )}
                            {task.quotations.length > 0 && (
                              <p className="text-[10px] text-zinc-400">
                                Quotations: {task.quotations.length}
                              </p>
                            )}
                          </div>
                          <ProcurementChainStatus taskId={task.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contract Info */}
                {project.contract && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2">
                      Linked Contract
                    </h3>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <Link
                          href={`/dashboard/contracts/${project.contract.id}`}
                          className="font-medium text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          {project.contract.contractNo || `Contract #${project.contract.id.slice(0, 8)}`}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {project.contract.name} • {project.contract.status}
                        </p>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {project.contract.currency} {project.contract.monthlyValue?.toLocaleString() ?? "0"}/mo
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {project.milestones.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Milestones</span>
                      </div>
                      <span className="text-xs text-zinc-500 font-normal">
                        {project.milestones.length} total
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {project.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-zinc-200">
                              {milestone.name}
                            </span>
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                              {milestone.status}
                            </Badge>
                          </div>
                          {milestone.description && (
                            <p className="text-zinc-400 text-[10px] mt-0.5">{milestone.description}</p>
                          )}
                          <p className="text-zinc-400 mt-1">
                            {milestone.deadline
                              ? `Due: ${new Date(milestone.deadline).toLocaleDateString()}`
                              : "No deadline set"}
                          </p>
                          {milestone.budget && (
                            <p className="text-zinc-400 mt-0.5">
                              Budget: {project.currency} {milestone.budget.toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Tasks */}
                {project.tasks.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <span>Recent Tasks</span>
                      </div>
                      <Link 
                        href={`/dashboard/projects/${project.id}/tasks`}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                      >
                        View All →
                      </Link>
                    </h3>
                    <div className="divide-y divide-zinc-800">
                      {project.tasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/dashboard/tasks/${task.id}`}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs hover:bg-zinc-800/40 px-2 rounded-lg transition-colors block"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-zinc-200 block truncate">
                              {task.title}
                            </span>
                            <span className="text-zinc-500 text-[10px]">
                              {task.assignees.length > 0 
                                ? `Assignee${task.assignees.length > 1 ? 's' : ''}: ${task.assignees.map(a => a.name).join(", ")}`
                                : "Unassigned"
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-3 ml-4 shrink-0">
                            <Badge 
                              className={
                                task.priority === "HIGH" || task.priority === "URGENT"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : task.priority === "MEDIUM"
                                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
                              }
                            >
                              {task.priority}
                            </Badge>
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                              {task.status}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Procurement Tasks Message */}
                {procurementTasks.length === 0 && (
                  <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-6 text-center">
                    <ClipboardList className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">
                      No procurement chains active in this project.
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Procurement chains start when tasks have planned expenses or quotations.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === "reporting" && (
              <ProjectReportingDashboard projectId={projectId} />
            )}

            {tab === "tasks" && <TasksTab projectId={projectId} />}
            
            {tab === "milestones" && (
              <MilestonesTab projectId={projectId} currency={project.currency} />
            )}
            
            {tab === "concepts" && <ConceptsTab projectId={projectId} />}

            {tab === "brief" && <BriefTab projectId={projectId} currency={project.currency} />}
            
            {tab === "comments" && <CommentsTab projectId={projectId} />}
            
            {tab === "tags" && <TagsTab projectId={projectId} />}
          </div>
        </div>

        {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* ─── Procurement Chain Widget ──────────────────────────────────── */}
          {procurementTaskIds.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <ProcurementChainWidget taskIds={procurementTaskIds.slice(0, 5)} />
            </div>
          )}

          {/* ─── Project Stats ────────────────────────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
              Project Stats
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Total Tasks</span>
                <span className="font-bold text-zinc-200">{project._count.tasks}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Completed</span>
                <span className="font-bold text-emerald-500">{completedTasks}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Milestones</span>
                <span className="font-bold text-zinc-200">{project._count.milestones}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Attachments</span>
                <span className="font-bold text-zinc-200">{project._count.attachments}</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-zinc-800">
                <span className="text-zinc-400">Progress</span>
                <span className="font-bold text-blue-400">{progress}%</span>
              </div>
            </div>
          </div>

          {/* ─── Client Info ──────────────────────────────────────────────────── */}
          {project.client && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                Client
              </h3>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-200">{project.client.clientName}</p>
                {project.client.email && (
                  <p className="text-xs text-zinc-400">{project.client.email}</p>
                )}
                {project.client.phoneNumber && (
                  <p className="text-xs text-zinc-400">{project.client.phoneNumber}</p>
                )}
                <Link
                  href={`/dashboard/clients/${project.client.id}`}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 mt-1"
                >
                  View Client
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* ─── Quick Actions ────────────────────────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href={`/dashboard/tasks/new?projectId=${project.id}`}>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <PlusCircle className="w-3.5 h-3.5 mr-2" />
                  New Task
                </Button>
              </Link>
              <Link href={`/dashboard/projects/${project.id}/edit`}>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <FileText className="w-3.5 h-3.5 mr-2" />
                  Edit Project
                </Button>
              </Link>
              <Link href={`/dashboard/projects/${project.id}/milestones/new`}>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <GitBranch className="w-3.5 h-3.5 mr-2" />
                  Add Milestone
                </Button>
              </Link>
              <Link href={`/dashboard/projects/${project.id}?tab=concepts`}>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <Lightbulb className="w-3.5 h-3.5 mr-2" />
                  View Concepts
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}