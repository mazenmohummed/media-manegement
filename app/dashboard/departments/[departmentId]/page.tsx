"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  AlertCircle,
  Users,
  Tag,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Department = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }[];
  taskCategories: {
    id: string;
    name: string;
    description: string | null;
  }[];
  _count: {
    users: number;
    taskCategories: number;
  };
};

export default function DepartmentDetailPage({
  params,
}: {
  params: { departmentId: string };
}) {
  const router = useRouter();
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadDepartment() {
      try {
        const res = await fetch(`/api/departments/${params.departmentId}`);
        if (res.ok) {
          const data = await res.json();
          setDepartment(data);
          setEditName(data.name);
        } else if (res.status === 404) {
          setError("Department not found");
        } else {
          setError("Failed to load department");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    loadDepartment();
  }, [params.departmentId]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || !department) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/departments/${params.departmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setDepartment((prev) =>
          prev ? { ...prev, name: updated.name } : null
        );
        setIsEditing(false);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update department");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this department?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/departments/${params.departmentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard/departments");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete department");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error || "Department not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/departments"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Departments
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Building2 className="w-5 h-5 text-purple-400 shrink-0" />
            {isEditing ? (
              <form
                onSubmit={handleUpdate}
                className="flex items-center gap-2 flex-1"
              >
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500 h-9"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-500 text-white gap-1"
                >
                  {saving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(department.name);
                  }}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <X className="w-3 h-3" />
                </Button>
              </form>
            ) : (
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-zinc-100 truncate">
                  {department.name}
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  ID: <span className="font-mono">{department.id}</span>
                </p>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="border-red-900/50 text-red-400 hover:bg-red-950/20 hover:text-red-300 gap-1.5"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Team Members
              </span>
              <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] ml-auto">
                {department._count.users}
              </Badge>
            </div>
            {department.users.length === 0 ? (
              <p className="text-xs text-zinc-600">No members assigned.</p>
            ) : (
              <div className="space-y-2">
                {department.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-zinc-300 truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-[10px] text-zinc-600">{user.email}</p>
                    </div>
                    <Badge
                      className={`text-[10px] ${
                        user.isActive
                          ? "bg-green-950/30 text-green-400 border-green-900/50"
                          : "bg-zinc-800 text-zinc-500 border-zinc-700"
                      }`}
                    >
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Tag className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Task Categories
              </span>
              <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] ml-auto">
                {department._count.taskCategories}
              </Badge>
            </div>
            {department.taskCategories.length === 0 ? (
              <p className="text-xs text-zinc-600">No categories assigned.</p>
            ) : (
              <div className="space-y-2">
                {department.taskCategories.map((cat) => (
                  <div key={cat.id} className="text-sm">
                    <p className="text-zinc-300">{cat.name}</p>
                    {cat.description && (
                      <p className="text-[10px] text-zinc-600 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 text-[10px] text-zinc-600 flex items-center justify-between">
          <span>Created {new Date(department.createdAt).toLocaleString()}</span>
          <span>Updated {new Date(department.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}