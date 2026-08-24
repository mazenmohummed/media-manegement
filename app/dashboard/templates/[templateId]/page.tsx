"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateType } from "@prisma/client";

interface TemplateItem {
  id?: string;
  milestoneName: string;
  taskTitle: string;
  taskType: string;
  description: string;
  estimatedHours: number;
  order: number;
  categoryId?: string | null;
}

interface TemplateData {
  id?: string;
  name: string;
  description: string;
  serviceType: string;
  type: TemplateType;
  items: TemplateItem[];
}

const EMPTY_ITEM: TemplateItem = {
  milestoneName: "",
  taskTitle: "",
  taskType: "",
  description: "",
  estimatedHours: 0,
  order: 0,
};

export default function TemplateBuilderPage() {
  const { templateId } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isNew = templateId === "new";

  const [template, setTemplate] = useState<TemplateData>({
    name: "",
    description: "",
    serviceType: "",
    type: TemplateType.PROJECT,
    items: [{ ...EMPTY_ITEM, order: 0 }],
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Load categories scoped to agency
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.agencyId) return;

    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const res = await fetch(
          `/api/task-categories?agencyId=${session!.user.agencyId}`
        );
        if (res.ok) {
          const data = await res.json();
          // Handle both array and { categories: [] } shapes
          const list = Array.isArray(data) ? data : data.categories || [];
          setCategories(list);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, [status, session]);

  // Load existing template
  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    fetch(`/api/project-templates/${templateId}`)
      .then((res) => res.json())
      .then((data: TemplateData) => {
        setTemplate({
          ...data,
          items:
            data.items?.length > 0
              ? data.items.sort((a, b) => a.order - b.order)
              : [{ ...EMPTY_ITEM, order: 0 }],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [templateId, isNew]);

  function updateField<K extends keyof TemplateData>(
    field: K,
    value: TemplateData[K]
  ) {
    setTemplate((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(index: number, field: keyof TemplateItem, value: any) {
    setTemplate((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function addItem() {
    setTemplate((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM, order: prev.items.length }],
    }));
  }

  function removeItem(index: number) {
    setTemplate((prev) => {
      const items = prev.items
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, order: i }));
      return { ...prev, items };
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= template.items.length) return;
    setTemplate((prev) => {
      const items = [...prev.items];
      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      return {
        ...prev,
        items: items.map((item, i) => ({ ...item, order: i })),
      };
    });
  }

  async function handleSave() {
    if (!template.name.trim()) return alert("Template name is required");
    if (
      template.items.some(
        (i) => !i.milestoneName.trim() && !i.taskTitle.trim()
      )
    ) {
      return alert("Each item needs at least a milestone name or task title");
    }

    setSaving(true);
    try {
      const url = isNew
        ? "/api/project-templates"
        : `/api/project-templates/${templateId}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/templates/${data.id}`);
        if (isNew) router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save template");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this template?")) return;
    try {
      const res = await fetch(`/api/project-templates/${templateId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/templates");
      } else {
        alert("Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/templates"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Templates
        </Link>
        {!isNew && (
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-900/50 text-red-400 hover:bg-red-950/30 gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        )}
      </div>

      {/* Header Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-bold text-zinc-100">
          {isNew ? "New Template" : template.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Template Name *
            </label>
            <Input
              value={template.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Product Launch"
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Service Type
            </label>
            <Input
              value={template.serviceType}
              onChange={(e) => updateField("serviceType", e.target.value)}
              placeholder="e.g. Marketing Campaign"
              className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">
            Description
          </label>
          <Input
            value={template.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="What is this template for?"
            className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Type</label>
          <div className="flex gap-2">
            {Object.values(TemplateType).map((t) => (
              <button
                key={t}
                onClick={() => updateField("type", t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  template.type === t
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {t === "PROJECT" ? "Project Blueprint" : "Task Blueprint"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Milestones & Tasks
          </h2>
          <Button
            onClick={addItem}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </Button>
        </div>

        <div className="space-y-2">
          {template.items.map((item, index) => (
            <div
              key={index}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 group hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === template.items.length - 1}
                    className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <GripVertical className="w-4 h-4 text-zinc-600" />
                <span className="text-xs font-mono text-zinc-500 w-8">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => removeItem(index)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase">
                    Milestone Name
                  </label>
                  <Input
                    value={item.milestoneName}
                    onChange={(e) =>
                      updateItem(index, "milestoneName", e.target.value)
                    }
                    placeholder="e.g. Discovery"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-8 focus-visible:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase">
                    Task Title
                  </label>
                  <Input
                    value={item.taskTitle}
                    onChange={(e) =>
                      updateItem(index, "taskTitle", e.target.value)
                    }
                    placeholder="e.g. Stakeholder Interviews"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-8 focus-visible:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase">
                    Task Type
                  </label>
                  <Input
                    value={item.taskType}
                    onChange={(e) =>
                      updateItem(index, "taskType", e.target.value)
                    }
                    placeholder="e.g. Research"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-8 focus-visible:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-500 uppercase">
                    Est. Hours
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={item.estimatedHours}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "estimatedHours",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-8 focus-visible:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase">
                  Description
                </label>
                <Input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  placeholder="Brief description of deliverables..."
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-8 focus-visible:ring-purple-500"
                />
              </div>

              {/* Task Category — FIXED */}
              
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase">
                  Task Category
                </label>
                <select
                  value={item.categoryId || ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "categoryId",
                      e.target.value ? e.target.value : null
                    )
                  }
                  disabled={categoriesLoading}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categoriesLoading && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Loading categories...
                  </p>
                )}
                {!categoriesLoading && categories.length === 0 && (
                  <p className="text-[10px] text-amber-600/70 mt-1">
                    No categories found. Create them in Task Categories first.
                  </p>
                )}
              </div>
              {!categoriesLoading && categories.length === 0 && (
                <p className="text-[10px] text-amber-600/70 mt-1">
                    No categories found.{" "}
                    <Link href="/dashboard/task-categories/new" className="underline hover:text-amber-500">
                    Create one
                    </Link>
                </p>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        <Link href="/dashboard/templates">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </div>
  );
}