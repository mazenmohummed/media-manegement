import { db } from "@/lib/db";
import { ProjectStatus, TaskStatus, MilestoneStatus } from "@prisma/client";
import Link from "next/link";
import { Briefcase, Flag, CheckSquare, Layers, LayoutTemplate } from "lucide-react";

export default async function ProjectsTasksDashboard({ searchParams }: { searchParams: { agencyId?: string } }) {
  // Assuming a default or context-based agency ID for multi-tenancy
  const agencyId = searchParams.agencyId || "default_agency_id";

  // Fetch aggregate counts and metrics
  const [activeProjectsCount, pendingMilestonesCount, completedTasksCount, activeTasksCount] = await Promise.all([
    db.project.count({ where: { agencyId, status: ProjectStatus.ACTIVE } }),
    db.milestone.count({ where: { agencyId, status: { in: [MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS] } } }),
    db.task.count({ where: { agencyId, status: TaskStatus.COMPLETED } }),
    db.task.count({ where: { agencyId, status: TaskStatus.ACTIVE } }),
  ]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header & Quick Navigation Menu */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects & Tasks Dashboard</h1>
          <p className="text-sm text-slate-500">Manage workflows, deliverables, categories, and templates.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NavLink href="/projects" icon={<Briefcase className="w-4 h-4" />} label="Projects" />
          <NavLink href="/milestones" icon={<Flag className="w-4 h-4" />} label="Milestones" />
          <NavLink href="/tasks" icon={<CheckSquare className="w-4 h-4" />} label="Tasks" />
          <NavLink href="/task-categories" icon={<Layers className="w-4 h-4" />} label="Categories" />
          <NavLink href="/templates" icon={<LayoutTemplate className="w-4 h-4" />} label="Templates" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Projects" value={activeProjectsCount} color="text-blue-600" />
        <MetricCard title="Pending Milestones" value={pendingMilestonesCount} color="text-amber-600" />
        <MetricCard title="Active Tasks" value={activeTasksCount} color="text-indigo-600" />
        <MetricCard title="Completed Tasks" value={completedTasksCount} color="text-emerald-600" />
      </div>

      {/* Recent Projects & Task Status Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Projects Overview</h3>
          {/* Add a table or list mapping recent projects here */}
          <p className="text-sm text-slate-500">List of active campaigns, project timelines, and progress indicators.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <button className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              + Create New Project
            </button>
            <button className="w-full py-2 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
              + Add Task Definition
            </button>
            <button className="w-full py-2 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
              Manage Task Categories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-medium transition">
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MetricCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <span className="text-sm font-medium text-slate-500">{title}</span>
      <span className={`text-3xl font-bold mt-2 ${color}`}>{value}</span>
    </div>
  );
}