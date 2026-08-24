"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  Folder,
  Milestone,
  Tag,
  Users,
  Calendar,
  AlignLeft,
  Type,
  Hash,
  DollarSign,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  name: string;
  projectNo: string | null;
}

interface Milestone {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface PlannedExpenseItem {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  totalEstimated: number;
  status?: string;
  description?: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId");
  const initialMilestoneId = searchParams.get("milestoneId");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [milestoneId, setMilestoneId] = useState(initialMilestoneId || "");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Planned Expenses State for new task creation
  const [expenses, setExpenses] = useState<PlannedExpenseItem[]>([]);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseItemName, setExpenseItemName] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("EQUIPMENT");
  const [expenseQuantity, setExpenseQuantity] = useState<string>("1");
  const [expenseUnitCost, setExpenseUnitCost] = useState<string>("0");
  const [expenseTaxRate, setExpenseTaxRate] = useState<string>("0");

  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  // Real-time calculation for active expense row input
  const computedRowTotal = useMemo(() => {
    const q = parseFloat(expenseQuantity) || 0;
    const u = parseFloat(expenseUnitCost) || 0;
    const t = parseFloat(expenseTaxRate) || 0;
    return q * u * (1 + t / 100);
  }, [expenseQuantity, expenseUnitCost, expenseTaxRate]);

  // Overall cumulative sum computed in real time across pending items
  const grandTotalEstimated = useMemo(() => {
    return expenses.reduce((acc, item) => acc + (item.totalEstimated || 0), 0);
  }, [expenses]);

  // Load reference data
  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, categoriesRes, usersRes] = await Promise.all([
          fetch("/api/projects?limit=100"),
          fetch("/api/task-categories"),
          fetch("/api/users/assignable"),
        ]);

        if (!isMounted.current) return;

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data.projects || []);
        }
        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        if (isMounted.current) setFetching(false);
      }
    }
    loadData();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load milestones when project changes
  useEffect(() => {
    async function loadMilestones() {
      if (!projectId) {
        setMilestones([]);
        setMilestoneId("");
        return;
      }

      setMilestoneLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/milestones`);
        if (!isMounted.current) return;

        if (res.ok) {
          const data = await res.json();
          const loaded = data.milestones || [];
          setMilestones(loaded);

          const stillValid = loaded.some((m: Milestone) => m.id === milestoneId);
          if (milestoneId && !stillValid) {
            setMilestoneId("");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted.current) setMilestoneLoading(false);
      }
    }
    loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Handlers for client-side temporary planned expenses list management prior to submit
  const handleAddOrUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseItemName.trim()) return;

    const qty = parseFloat(expenseQuantity) || 1;
    const cost = parseFloat(expenseUnitCost) || 0;
    const tax = parseFloat(expenseTaxRate) || 0;
    const totalEstimated = qty * cost * (1 + tax / 100);

    if (editingExpenseId) {
      setExpenses(
        expenses.map((ex) =>
          ex.id === editingExpenseId
            ? {
                ...ex,
                itemName: expenseItemName.trim(),
                category: expenseCategory,
                quantity: qty,
                unitCost: cost,
                taxRate: tax,
                totalEstimated,
              }
            : ex
        )
      );
    } else {
      const newItem: PlannedExpenseItem = {
        id: `temp-${Date.now()}`,
        itemName: expenseItemName.trim(),
        category: expenseCategory,
        quantity: qty,
        unitCost: cost,
        taxRate: tax,
        totalEstimated,
      };
      setExpenses([newItem, ...expenses]);
    }
    resetExpenseForm();
  };

  const startEditExpense = (item: PlannedExpenseItem) => {
    setEditingExpenseId(item.id);
    setExpenseItemName(item.itemName);
    setExpenseCategory(item.category);
    setExpenseQuantity(item.quantity.toString());
    setExpenseUnitCost(item.unitCost.toString());
    setExpenseTaxRate(item.taxRate.toString());
  };

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseItemName("");
    setExpenseCategory("EQUIPMENT");
    setExpenseQuantity("1");
    setExpenseUnitCost("0");
    setExpenseTaxRate("0");
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((ex) => ex.id !== id));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Task title is required");
    if (!projectId) return setError("Project is required");

    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          projectId,
          milestoneId: milestoneId || null,
          categoryId: categoryId || null,
          priority,
          dueDate: dueDate || null,
          assigneeIds: selectedAssignees,
          plannedExpenses: expenses.map(({ itemName, category, quantity, unitCost, taxRate, totalEstimated }) => ({
            itemName,
            category,
            quantity,
            unitCost,
            taxRate,
            totalEstimated,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/tasks/${data.id}`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create task");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const toggleAssignee = (id: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSubmit = title.trim().length > 0 && projectId.length > 0 && !loading;

  const nativeInputClass =
    "w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-zinc-600";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/tasks"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tasks
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-purple-400" />
          <h1 className="text-2xl font-bold text-zinc-100">New Task</h1>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Type className="w-3 h-3" /> Task Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design homepage mockup"
              autoFocus
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500 placeholder:text-zinc-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <AlignLeft className="w-3 h-3" /> Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task requirements, acceptance criteria, links, etc."
              rows={4}
              className={`${nativeInputClass} resize-y`}
            />
          </div>

          {/* Project & Milestone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="project" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Folder className="w-3 h-3" /> Project *
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={fetching}
                className={`${nativeInputClass} disabled:opacity-50 appearance-none`}
              >
                <option value="">{fetching ? "Loading projects…" : "Select project"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.projectNo ? ` (${p.projectNo})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="milestone" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Milestone className="w-3 h-3" /> Milestone
              </label>
              <div className="relative">
                <select
                  id="milestone"
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  disabled={!projectId || milestoneLoading}
                  className={`${nativeInputClass} disabled:opacity-50 appearance-none pr-8`}
                >
                  <option value="">
                    {!projectId
                      ? "Select a project first"
                      : milestoneLoading
                      ? "Loading milestones…"
                      : milestones.length === 0
                      ? "No milestones"
                      : "No milestone"}
                  </option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {milestoneLoading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Category
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`${nativeInputClass} appearance-none`}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="priority" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`${nativeInputClass} appearance-none`}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="dueDate" className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Due Date
            </label>
            <input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${nativeInputClass} [color-scheme:dark]`}
            />
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Assignees
              {selectedAssignees.length > 0 && (
                <span className="text-[10px] text-zinc-500 ml-1">
                  ({selectedAssignees.length} selected)
                </span>
              )}
            </label>
            {users.length === 0 && !fetching ? (
              <p className="text-xs text-zinc-600 italic">No users available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {users.map((u) => {
                  const selected = selectedAssignees.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                        selected
                          ? "bg-purple-600/20 text-purple-300 border-purple-600/40"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750 hover:text-zinc-300"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-300">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Planned Expenses Integration */}
          <div className="pt-4 border-t border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Planned Expenses</h2>
              </div>
              <div className="text-xs font-medium text-zinc-400">
                Total Estimated: <span className="text-purple-400 font-bold">${grandTotalEstimated.toFixed(2)}</span>
              </div>
            </div>

            {/* Expense Input Row Form */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Item Name</label>
                <Input
                  value={expenseItemName}
                  onChange={(e) => setExpenseItemName(e.target.value)}
                  placeholder="Item name..."
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Quantity</label>
                <Input
                  type="number"
                  step="any"
                  value={expenseQuantity}
                  onChange={(e) => setExpenseQuantity(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Unit Cost</label>
                <Input
                  type="number"
                  step="any"
                  value={expenseUnitCost}
                  onChange={(e) => setExpenseUnitCost(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Tax (%)</label>
                <Input
                  type="number"
                  step="any"
                  value={expenseTaxRate}
                  onChange={(e) => setExpenseTaxRate(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs"
                />
              </div>

              <div className="flex flex-col justify-end">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">Total</span>
                <div className="h-9 px-3 flex items-center bg-zinc-900 border border-zinc-800 rounded-md text-xs font-semibold text-purple-300">
                  ${computedRowTotal.toFixed(2)}
                </div>
              </div>

              <div className="sm:col-span-6 flex items-center justify-end gap-2 pt-1">
                {editingExpenseId && (
                  <Button type="button" variant="ghost" size="sm" onClick={resetExpenseForm} className="text-zinc-400 text-xs h-8">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                )}
                <Button type="button" size="sm" onClick={handleAddOrUpdateExpense} className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8">
                  {editingExpenseId ? <Save className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  {editingExpenseId ? "Update Item" : "Add Line Item"}
                </Button>
              </div>
            </div>

            {/* Temporary Expense Line Items List */}
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No expense items added for this task yet.</p>
              ) : (
                expenses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 px-3 py-2.5 rounded-lg text-xs">
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
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => startEditExpense(item)} className="h-7 w-7 text-zinc-400 hover:text-zinc-200">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteExpense(item.id)} className="h-7 w-7 text-red-400 hover:text-red-300">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Link href="/dashboard/tasks">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {!loading && <Save className="w-4 h-4" />}
              {loading ? "Creating…" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}