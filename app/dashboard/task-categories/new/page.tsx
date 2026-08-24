"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag, Loader2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewTaskCategoryPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await fetch("/api/departments");
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : data.departments || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      } finally {
        setFetching(false);
      }
    }
    loadDepartments();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Category name is required");

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/task-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          departmentId: departmentId || null,
        }),
      });

      if (res.ok) {
        router.push("/dashboard/task-categories");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create category");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/task-categories"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Categories
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5 text-purple-400" />
          <h1 className="text-2xl font-bold text-zinc-100">
            New Task Category
          </h1>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Category Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Video Production"
              autoFocus
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
            <p className="text-[10px] text-zinc-600">
              Must be unique within your agency.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of work falls under this category?"
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={fetching}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              <option value="">No department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {fetching && (
              <p className="text-[10px] text-zinc-600">Loading departments...</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Link href="/dashboard/task-categories">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {loading ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}