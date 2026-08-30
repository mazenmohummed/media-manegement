// components/projects/ProjectDetailTabs.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  GitBranch,
  BarChart3,
  MessageSquare,
  Tag,
  Clock,
  DollarSign,
  Users,
  FileText,
  Settings,
} from "lucide-react";

export interface Tab {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface ProjectDetailTabsProps {
  projectId: string;
  tabs: Tab[];
  activeTab: string;
  className?: string;
}

export function ProjectDetailTabs({
  projectId,
  tabs,
  activeTab,
  className = "",
}: ProjectDetailTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = (tabKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabKey);
    return `/dashboard/projects/${projectId}?${params.toString()}`;
  };

  return (
    <div className={`flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const href = buildHref(tab.key);

        return (
          <Link
            key={tab.key}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded-full text-[9px] font-medium">
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ─── Pre-built tab configurations ────────────────────────────────────────────

export const getDefaultProjectTabs = (counts?: {
  tasks?: number;
  milestones?: number;
  comments?: number;
  tags?: number;
}): Tab[] => {
  return [
    {
      key: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      key: "tasks",
      label: "Tasks",
      icon: ListChecks,
      count: counts?.tasks || 0,
    },
    {
      key: "milestones",
      label: "Milestones",
      icon: GitBranch,
      count: counts?.milestones || 0,
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
      count: counts?.comments || 0,
    },
    {
      key: "tags",
      label: "Tags",
      icon: Tag,
      count: counts?.tags || 0,
    },
  ];
};

export const getFinanceProjectTabs = (counts?: {
  invoices?: number;
  payments?: number;
  expenses?: number;
}): Tab[] => {
  return [
    {
      key: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: FileText,
      count: counts?.invoices || 0,
    },
    {
      key: "payments",
      label: "Payments",
      icon: DollarSign,
      count: counts?.payments || 0,
    },
    {
      key: "expenses",
      label: "Expenses",
      icon: DollarSign,
      count: counts?.expenses || 0,
    },
    {
      key: "reporting",
      label: "Reporting",
      icon: BarChart3,
    },
  ];
};

export const getTeamProjectTabs = (counts?: {
  members?: number;
  tasks?: number;
  milestones?: number;
}): Tab[] => {
  return [
    {
      key: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      key: "team",
      label: "Team",
      icon: Users,
      count: counts?.members || 0,
    },
    {
      key: "tasks",
      label: "Tasks",
      icon: ListChecks,
      count: counts?.tasks || 0,
    },
    {
      key: "milestones",
      label: "Milestones",
      icon: GitBranch,
      count: counts?.milestones || 0,
    },
    {
      key: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];
};

// ─── Client-side tab switcher (for use in client components) ──────────────

interface ClientTabSwitcherProps {
  projectId: string;
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tabKey: string) => void;
}

export function ClientTabSwitcher({
  projectId,
  tabs,
  defaultTab = "overview",
  onTabChange,
}: ClientTabSwitcherProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") || defaultTab;

  const handleTabClick = (tabKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onTabChange) {
      onTabChange(tabKey);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabKey);
    window.history.pushState({}, "", `${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={(e) => handleTabClick(tab.key, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded-full text-[9px] font-medium">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}