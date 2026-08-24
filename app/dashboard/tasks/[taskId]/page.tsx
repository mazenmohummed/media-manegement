"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Send,
  Plus,
  Trash2,
  Save,
  Loader2,
  Milestone,
  Edit3,
  X,
  Check,
  Link2,
  Unlink,
  Search,
  DollarSign,
  Edit2,
  Receipt,
  Users,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProgressIndicatorProps {
  progress: number;
  completedTodos: number;
  totalTodos: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface Comment {
  id: string;
  text: string;
  author: User | null;
  createdAt: string;
}

interface Todo {
  id: string;
  text: string;
  description: string | null;
  completed: boolean;
  priority: string;
  order: number;
  dueDate: string | null;
  createdBy: User | null;
}

interface TaskDependency {
  id: string;
  title: string | null;
  taskNo: string | null;
  status: string;
}

interface MilestoneData {
  id: string;
  name: string;
  progress: number;
  status: string;
  deadline: string | null;
}

interface PlannedExpenseItem {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  totalEstimated: number;
  status: string;
}

interface TaskExpenseItem {
  id: string;
  itemName: string;
  cost: number;
  category: string;
  status: string;
  description: string | null;
  reimbursable: boolean;
  plannedExpenseId?: string | null;
}

interface TaskDetail {
  id: string;
  taskNo: string | null;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  estimatedHours: number;
  actualHours: number;
  assignees: User[];
  category: { id: string; name: string } | null;
  milestone: MilestoneData | null;
    project: {
    id: string;
    name: string;
    projectNo: string | null;
    client?: {
      id: string;
      clientName: string;
      email: string | null;
      phoneNumber: string | null;
      accountType: string | null;
    } | null;
  } | null;
  dependsOn: TaskDependency[];
  dependents: TaskDependency[];
  comments: Comment[];
  todos: Todo[];
  plannedExpenses?: PlannedExpenseItem[];
  taskExpenses?: TaskExpenseItem[];
  _count: { comments: number; todos: number; plannedExpenses?: number; taskExpenses?: number };
  createdAt: string;
  updatedAt: string;
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

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "comments" | "todos" | "dependencies" | "planned-expenses" | "task-expenses">("overview");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setDescValue(data.description || "");
      } else if (res.status === 404) {
        router.push("/dashboard/tasks");
      }
    } catch (err) {
      console.error("Failed to load task:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId, router]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const updateTask = async (updates: Partial<TaskDetail>) => {
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
    } catch (err) {
      console.error("Update failed:", err);
    }
    return false;
  };

  const handleSaveDesc = async () => {
    setSavingDesc(true);
    const ok = await updateTask({ description: descValue });
    if (ok) setEditingDesc(false);
    setSavingDesc(false);
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

  const status = statusConfig[task.status] || statusConfig.PENDING;
  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
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
          <Link href={`/dashboard/tasks/${taskId}/budget`}>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-700/60 text-purple-300 hover:bg-purple-950/40"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Budget & Roll-up
            </Button>
          </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => router.push(`/dashboard/tasks/${taskId}/edit`)}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
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
             completedTodos={task.todos ? task.todos.filter((t) => t.completed).length : 0}
             totalTodos={task.todos ? task.todos.length : 0}
            />
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500">
          {task.milestone && (
            <div className="flex items-center gap-1.5">
              <Milestone className="w-3.5 h-3.5 text-purple-400" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 overflow-x-auto">
            {([
              { key: "overview", label: "Overview", icon: BarChart3 },
              { key: "comments", label: `Comments (${task._count.comments})`, icon: MessageSquare },
              { key: "todos", label: `Todos (${task._count.todos})`, icon: ListChecks },
              { key: "dependencies", label: "Dependencies", icon: GitBranch },
              { key: "planned-expenses", label: "Planned Expenses", icon: DollarSign },
              { key: "task-expenses", label: "Task Expenses", icon: Receipt },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            {/* Direct Tab Link to Budget Dashboard */}
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
            {activeTab === "overview" && (
              <OverviewTab
                task={task}
                editingDesc={editingDesc}
                setEditingDesc={setEditingDesc}
                descValue={descValue}
                setDescValue={setDescValue}
                savingDesc={savingDesc}
                onSaveDesc={handleSaveDesc}
              />
            )}
            {activeTab === "comments" && (
              <CommentsTab taskId={taskId} comments={task.comments} onUpdate={fetchTask} />
            )}
            {activeTab === "todos" && <TodosTab taskId={taskId} todos={task.todos} onUpdate={fetchTask} />}
            {activeTab === "dependencies" && (
              <DependenciesTab
                taskId={taskId}
                dependsOn={task.dependsOn}
                dependents={task.dependents}
                onUpdate={fetchTask}
              />
            )}
            {activeTab === "planned-expenses" && (
              <TaskPlannedExpensesManager taskId={taskId} initialExpenses={task.plannedExpenses || []} />
            )}
            {activeTab === "task-expenses" && (
              <TaskExpensesManager taskId={taskId} initialExpenses={task.taskExpenses || []} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {task.project?.client && <ClientCard client={task.project.client} />}
          <AssigneesCard taskId={taskId} assignees={task.assignees} onUpdate={fetchTask} />
          <StatusCard task={task} onUpdate={updateTask} />
          <DatesCard task={task} onUpdate={updateTask} />
        </div>
      </div>
    </div>
  );
}

function TaskPlannedExpensesManager({ taskId, initialExpenses }: { taskId: string; initialExpenses: PlannedExpenseItem[] }) {
  const [expenses, setExpenses] = useState<PlannedExpenseItem[]>(initialExpenses);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("EQUIPMENT");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<string>("0");
  const [taxRate, setTaxRate] = useState<string>("0");

  // Filter only the approved expenses for display and calculations here
  const approvedExpenses = useMemo(() => {
    return expenses.filter((item) => item.status === "APPROVED");
  }, [expenses]);

  const computedRowTotal = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const u = parseFloat(unitCost) || 0;
    const t = parseFloat(taxRate) || 0;
    return q * u * (1 + t / 100);
  }, [quantity, unitCost, taxRate]);

  // Grand total will now only calculate based on approved expenses
  const grandTotalEstimated = useMemo(() => {
    return approvedExpenses.reduce((acc, item) => acc + (item.totalEstimated || 0), 0);
  }, [approvedExpenses]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const payload = {
      itemName,
      category,
      quantity: parseFloat(quantity) || 1,
      unitCost: parseFloat(unitCost) || 0,
      taxRate: parseFloat(taxRate) || 0,
    };

    if (editingId) {
      const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setExpenses(expenses.map((ex) => (ex.id === editingId ? data.plannedExpense : ex)));
        resetForm();
      }
    } else {
      const res = await fetch(`/api/tasks/${taskId}/planned-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setExpenses([data.plannedExpense, ...expenses]);
        resetForm();
      }
    }
  };

  const handleConvertToActual = async (id: string) => {
    const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${id}/convert`, {
      method: "POST",
    });

    if (res.ok) {
      alert("Successfully converted planned expense into an actual expense!");
      setExpenses(
        expenses.map((ex) => (ex.id === id ? { ...ex, status: "APPROVED" } : ex))
      );
    } else {
      alert("Failed to convert expense.");
    }
  };

  const startEdit = (item: PlannedExpenseItem) => {
    setEditingId(item.id);
    setItemName(item.itemName);
    setCategory(item.category);
    setQuantity(item.quantity.toString());
    setUnitCost(item.unitCost.toString());
    setTaxRate(item.taxRate.toString());
  };

  const resetForm = () => {
    setEditingId(null);
    setItemName("");
    setCategory("EQUIPMENT");
    setQuantity("1");
    setUnitCost("0");
    setTaxRate("0");
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tasks/${taskId}/planned-expenses/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setExpenses(expenses.filter((ex) => ex.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-zinc-100">Planned Expenses</h2>
        </div>
        <div className="text-sm font-medium text-zinc-400">
          Total Estimated: <span className="text-purple-400 font-bold">${grandTotalEstimated.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Item Name</label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Item name..."
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Quantity</label>
          <Input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Unit Cost</label>
          <Input
            type="number"
            step="any"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Tax Rate (%)</label>
          <Input
            type="number"
            step="any"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div className="flex flex-col justify-end">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Auto Total</span>
          <div className="h-9 px-3 flex items-center bg-zinc-900 border border-zinc-800 rounded-md text-xs font-semibold text-purple-300">
            ${computedRowTotal.toFixed(2)}
          </div>
        </div>

        <div className="sm:col-span-6 flex items-center justify-end gap-2 pt-2">
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="text-zinc-400 text-xs">
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          )}
          <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
            {editingId ? <Save className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            {editingId ? "Update Line Item" : "Add Line Item"}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {approvedExpenses.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">No approved planned expenses added yet.</p>
        ) : (
          approvedExpenses.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 px-4 py-3 rounded-lg text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-200">{item.itemName}</span>
                <div className="text-zinc-500 text-[11px] flex gap-3">
                  <span>Qty: {item.quantity}</span>
                  <span>Unit: ${item.unitCost.toFixed(2)}</span>
                  <span>Tax: {item.taxRate}%</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-bold text-purple-400">${item.totalEstimated.toFixed(2)}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConvertToActual(item.id)}
                    className="h-7 border-purple-700/60 text-purple-300 hover:bg-purple-950/40 text-[11px]"
                  >
                    <Receipt className="w-3 h-3 mr-1" /> Convert
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-7 w-7 text-zinc-400 hover:text-zinc-200">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-7 w-7 text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
function TaskExpensesManager({ taskId, initialExpenses }: { taskId: string; initialExpenses: TaskExpenseItem[] }) {
  const [expenses, setExpenses] = useState<TaskExpenseItem[]>(initialExpenses);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [cost, setCost] = useState<string>("0");
  const [category, setCategory] = useState("EQUIPMENT");
  const [description, setDescription] = useState("");
  const [reimbursable, setReimbursable] = useState(false);

  const grandTotalCost = useMemo(() => {
    return expenses.reduce((acc, item) => acc + (item.cost || 0), 0);
  }, [expenses]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const payload = {
      itemName,
      cost: parseFloat(cost) || 0,
      category,
      description,
      reimbursable,
    };

    if (editingId) {
      const res = await fetch(`/api/tasks/${taskId}/task-expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setExpenses(expenses.map((ex) => (ex.id === editingId ? data.taskExpense : ex)));
        resetForm();
      }
    } else {
      const res = await fetch(`/api/tasks/${taskId}/task-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setExpenses([data.taskExpense, ...expenses]);
        resetForm();
      }
    }
  };

  const startEdit = (item: TaskExpenseItem) => {
    setEditingId(item.id);
    setItemName(item.itemName);
    setCost(item.cost.toString());
    setCategory(item.category);
    setDescription(item.description || "");
    setReimbursable(item.reimbursable);
  };

  const resetForm = () => {
    setEditingId(null);
    setItemName("");
    setCost("0");
    setCategory("EQUIPMENT");
    setDescription("");
    setReimbursable(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tasks/${taskId}/task-expenses/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setExpenses(expenses.filter((ex) => ex.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-zinc-100">Task Expenses (Actual)</h2>
        </div>
        <div className="text-sm font-medium text-zinc-400">
          Total Cost: <span className="text-purple-400 font-bold">${grandTotalCost.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
        <div className="sm:col-span-2">
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Item Name</label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Expense title..."
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Actual Cost</label>
          <Input
            type="number"
            step="any"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-9 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-300 px-3"
          >
            <option value="EQUIPMENT">Equipment</option>
            <option value="TRAVEL">Travel</option>
            <option value="SERVICES">Services</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="sm:col-span-4 flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={reimbursable}
              onChange={(e) => setReimbursable(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-purple-600 focus:ring-purple-500"
            />
            Reimbursable Expense
          </label>

          <div className="flex items-center gap-2">
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="text-zinc-400 text-xs">
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            )}
            <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
              {editingId ? <Save className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              {editingId ? "Update Actual Expense" : "Add Actual Expense"}
            </Button>
          </div>
        </div>
      </form>

      <div className="space-y-2">
        {expenses.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">No actual task expenses added yet.</p>
        ) : (
          expenses.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 px-4 py-3 rounded-lg text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-200">{item.itemName}</span>
                <div className="text-zinc-500 text-[11px] flex gap-3">
                  <span>Category: {item.category}</span>
                  {item.reimbursable && <span className="text-emerald-400 font-medium">Reimbursable</span>}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-bold text-purple-400">${item.cost.toFixed(2)}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-7 w-7 text-zinc-400 hover:text-zinc-200">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-7 w-7 text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
export function ProgressIndicator({ progress, completedTodos, totalTodos }: ProgressIndicatorProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Progress</span>
        <span>{completedTodos}/{totalTodos} ({progress}%)</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-purple-500 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
}
function OverviewTab({
  task,
  editingDesc,
  setEditingDesc,
  descValue,
  setDescValue,
  savingDesc,
  onSaveDesc,
}: {
  task: TaskDetail;
  editingDesc: boolean;
  setEditingDesc: (v: boolean) => void;
  descValue: string;
  setDescValue: (v: string) => void;
  savingDesc: boolean;
  onSaveDesc: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-300">Description</h3>
          {!editingDesc ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-zinc-500 hover:text-zinc-300"
              onClick={() => setEditingDesc(true)}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-emerald-400 hover:text-emerald-300"
                onClick={onSaveDesc}
                disabled={savingDesc}
              >
                {savingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-zinc-500 hover:text-zinc-300"
                onClick={() => {
                  setDescValue(task.description || "");
                  setEditingDesc(false);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        {editingDesc ? (
          <textarea
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-y"
            placeholder="Add a description..."
          />
        ) : task.description ? (
          <p className="text-sm text-zinc-400 whitespace-pre-wrap">{task.description}</p>
        ) : (
          <p className="text-sm text-zinc-600 italic">No description provided.</p>
        )}
      </div>

      {task.milestone && (
        <div className="pt-4 border-t border-zinc-800/60">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Milestone Progress</h3>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Milestone className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-zinc-200">{task.milestone.name}</span>
              </div>
              <Badge className={`${statusConfig[task.milestone.status]?.color ?? statusConfig.PENDING.color} text-[10px]`}>
                {statusConfig[task.milestone.status]?.label ?? "Pending"}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Overall Completion</span>
                <span className="font-mono">{task.milestone.progress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${task.milestone.progress}%` }}
                />
              </div>
            </div>
            {task.milestone.deadline && (
              <p className="text-xs text-zinc-500">
                Deadline: {new Date(task.milestone.deadline).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CommentsTab({
  taskId,
  comments,
  onUpdate,
}: {
  taskId: string;
  comments: Comment[];
  onUpdate: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        setText("");
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting || !text.trim()}
          size="sm"
          className="bg-purple-600 hover:bg-purple-500 text-white"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0">
                {c.author?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-300">{c.author?.name ?? "Unknown"}</span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-0.5">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TodosTab({
  taskId,
  todos,
  onUpdate,
}: {
  taskId: string;
  todos: Todo[];
  onUpdate: () => void;
}) {
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const toggleTodo = async (todoId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText.trim() }),
      });
      if (res.ok) {
        setNewText("");
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/todos/${todoId}`, { method: "DELETE" });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-300">Subtasks</span>
          <span className="text-xs text-zinc-500">
            {completedCount}/{todos.length} done
          </span>
        </div>
        {todos.length > 0 && (
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <form onSubmit={addTodo} className="flex items-center gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a subtask..."
          className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500 flex-1"
        />
        <Button
          type="submit"
          disabled={adding || !newText.trim()}
          size="sm"
          className="bg-purple-600 hover:bg-purple-500 text-white"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </form>

      <div className="space-y-1">
        {todos.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">No subtasks yet.</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 group"
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  todo.completed
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "border-zinc-600 hover:border-zinc-400"
                }`}
              >
                {todo.completed && <Check className="w-3 h-3" />}
              </button>
              <span
                className={`text-sm flex-1 ${
                  todo.completed ? "text-zinc-600 line-through" : "text-zinc-300"
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DependenciesTab({
  taskId,
  dependsOn,
  dependents,
  onUpdate,
}: {
  taskId: string;
  dependsOn: TaskDependency[];
  dependents: TaskDependency[];
  onUpdate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TaskDependency[]>([]);
  const [searching, setSearching] = useState(false);

  const searchTasks = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/tasks?q=${encodeURIComponent(q)}&exclude=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.tasks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const addDependency = async (depId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependsOnId: depId }),
      });
      if (res.ok) {
        setSearch("");
        setResults([]);
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeDependency = async (depId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies?dependsOnId=${depId}`, {
        method: "DELETE",
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-300">Add Dependency</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              searchTasks(e.target.value);
            }}
            placeholder="Search tasks to link..."
            className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
          />
        </div>
        {searching && <p className="text-xs text-zinc-500">Searching...</p>}
        {results.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => addDependency(r.id)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 text-left transition-colors"
              >
                <div>
                  <p className="text-sm text-zinc-300">{r.title ?? "Untitled"}</p>
                  <p className="text-[10px] text-zinc-600">{r.taskNo ?? r.id.slice(0, 8)}</p>
                </div>
                <Link2 className="w-3.5 h-3.5 text-zinc-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-300">This task depends on</h3>
        {dependsOn.length === 0 ? (
          <p className="text-xs text-zinc-600">No upstream dependencies.</p>
        ) : (
          <div className="space-y-1">
            {dependsOn.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-800 rounded-lg"
              >
                <Link href={`/dashboard/tasks/${dep.id}`} className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{dep.title ?? "Untitled"}</p>
                  <p className="text-[10px] text-zinc-600">{dep.taskNo ?? dep.id.slice(0, 8)}</p>
                </Link>
                <button
                  onClick={() => removeDependency(dep.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-300">Dependent tasks</h3>
        {dependents.length === 0 ? (
          <p className="text-xs text-zinc-600">No downstream dependents.</p>
        ) : (
          <div className="space-y-1">
            {dependents.map((dep) => (
              <Link
                key={dep.id}
                href={`/dashboard/tasks/${dep.id}`}
                className="block p-2 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
              >
                <p className="text-sm text-zinc-300">{dep.title ?? "Untitled"}</p>
                <p className="text-[10px] text-zinc-600">{dep.taskNo ?? dep.id.slice(0, 8)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssigneesCard({
  taskId,
  assignees,
  onUpdate,
}: {
  taskId: string;
  assignees: User[];
  onUpdate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const searchUsers = async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const addAssignee = async (userId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setShowAdd(false);
        setSearch("");
        setUsers([]);
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeAssignee = async (userId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees?userId=${userId}`, { method: "DELETE" });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" /> Assignees
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-zinc-500 hover:text-zinc-300"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users..."
              className="pl-8 bg-zinc-950 border-zinc-800 text-zinc-100 text-sm focus-visible:ring-purple-500 h-8"
            />
          </div>
          {searching && <p className="text-xs text-zinc-500">Searching...</p>}
          {users.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => addAssignee(u.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-300">{u.name}</p>
                    <p className="text-[10px] text-zinc-600">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {assignees.length === 0 ? (
          <p className="text-xs text-zinc-600">No assignees.</p>
        ) : (
          assignees.map((a) => (
            <div key={a.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{a.name}</p>
                  <p className="text-[10px] text-zinc-600">{a.role}</p>
                </div>
              </div>
              <button
                onClick={() => removeAssignee(a.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusCard({
  task,
  onUpdate,
}: {
  task: TaskDetail;
  onUpdate: (updates: Partial<TaskDetail>) => Promise<boolean>;
}) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (status: string) => {
    setUpdating(true);
    await onUpdate({ status });
    setUpdating(false);
  };

  const handlePriorityChange = async (priority: string) => {
    setUpdating(true);
    await onUpdate({ priority });
    setUpdating(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300">Status & Priority</h3>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</label>
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        >
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Priority</label>
        <select
          value={task.priority}
          onChange={(e) => handlePriorityChange(e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>
    </div>
  );
}

function DatesCard({
  task,
  onUpdate,
}: {
  task: TaskDetail;
  onUpdate: (updates: Partial<TaskDetail>) => Promise<boolean>;
}) {
  const [updating, setUpdating] = useState(false);

  const updateDate = async (field: string, value: string) => {
    setUpdating(true);
    await onUpdate({ [field]: value ? new Date(value).toISOString() : null });
    setUpdating(false);
  };

  const toInputValue = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-purple-400" /> Dates
      </h3>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Due Date</label>
        <input
          type="datetime-local"
          value={toInputValue(task.dueDate)}
          onChange={(e) => updateDate("dueDate", e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Start Date</label>
        <input
          type="datetime-local"
          value={toInputValue(task.startDate)}
          onChange={(e) => updateDate("startDate", e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">End Date</label>
        <input
          type="datetime-local"
          value={toInputValue(task.endDate)}
          onChange={(e) => updateDate("endDate", e.target.value)}
          disabled={updating}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}

function ClientCard({ client }: { client: NonNullable<TaskDetail["project"]>["client"] }) {
  if (!client) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-purple-400" /> Client
      </h3>
      <div className="space-y-1">
        <p className="text-sm text-zinc-200 font-medium">{client.clientName}</p>
        {client.accountType && (
          <p className="text-[11px] text-zinc-500">{client.accountType}</p>
        )}
        {client.email && <p className="text-xs text-zinc-400">{client.email}</p>}
        {client.phoneNumber && <p className="text-xs text-zinc-400">{client.phoneNumber}</p>}
      </div>
    </div>
  );
}