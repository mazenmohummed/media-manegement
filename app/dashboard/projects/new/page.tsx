import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { ArrowLeft, Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectStatus } from "@prisma/client";
import { TemplateProjectStarter } from "@/components/projects/template-project-starter";

interface PageProps {
  searchParams: Promise<{ template?: string }>;
}

export default async function NewProjectPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) return notFound();

  const agencyId = session.user.agencyId;
  const { template: preselectedTemplateId } = await searchParams;

  const [clients, contracts, templates, eligibleUsers] = await Promise.all([
    db.client.findMany({
      where: { agencyId },
      select: { id: true, clientName: true, clientNo: true },
      orderBy: { clientName: "asc" },
    }),
    db.contract.findMany({
      where: { agencyId, status: "ACTIVE" },
      select: { id: true, contractNo: true, name: true, clientId: true },
      orderBy: { createdAt: "desc" },
    }),
    db.projectTemplate.findMany({
      where: { agencyId },
      select: { id: true, name: true, description: true, _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.user.findMany({
      where: { 
        agencyId, 
        isActive: true,
        role: { in: ["ADMIN", "OPERATOR", "TEAMLEADER"] } 
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const selectedTemplate = preselectedTemplateId
    ? templates.find((t) => t.id === preselectedTemplateId)
    : null;

  async function createProject(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.agencyId) throw new Error("Unauthorized");

    const agencyId = session.user.agencyId;
    const name = formData.get("name") as string;
    const projectName = formData.get("projectName") as string;
    const clientId = formData.get("clientId") as string;
    const contractId = formData.get("contractId") as string;
    const assignedUserId = formData.get("assignedUserId") as string;
    const currency = (formData.get("currency") as string) || "EGP";
    const totalValue = parseFloat(formData.get("totalValue") as string) || 0;
    const targetDeadline = formData.get("targetDeadline") as string;
    const projectStory = formData.get("projectStory") as string;
    const status = (formData.get("status") as ProjectStatus) || ProjectStatus.DRAFT;

    if (!name || !clientId) throw new Error("Project name and client are required");

    if (assignedUserId) {
      const userCheck = await db.user.findFirst({
        where: { id: assignedUserId, agencyId, isActive: true },
      });
      if (!userCheck) throw new Error("Invalid assignee selected");
    }

    const projectCount = await db.project.count({ where: { agencyId } });
    const projectNo = `PRJ-${new Date().getFullYear()}-${String(projectCount + 1).padStart(4, "0")}`;

    // ✅ Remove userId field - it doesn't exist in the schema
    const project = await db.project.create({
      data: {
        projectNo,
        name,
        projectName: projectName || name,
        status,
        currency,
        totalValue,
        agencyId,
        clientId,
        contractId: contractId || undefined,
        targetDeadline: targetDeadline ? new Date(targetDeadline) : undefined,
        projectStory: projectStory || undefined,
      },
    });

    // ✅ Create resource allocation for assigned user if provided
    if (assignedUserId) {
      await db.resourceAllocation.create({
        data: {
          userId: assignedUserId,
          projectId: project.id,
          agencyId: agencyId,
          startDate: new Date(),
          allocationPercent: 100.0,
        },
      });
    }

    redirect(`/dashboard/projects/${project.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link href="/dashboard/projects" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-zinc-100">New Project</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {selectedTemplate
            ? "Quick-start from a template, or switch to manual setup."
            : "Create a one-off project manually, or accelerate with a template."}
        </p>
      </div>

      {/* Template Mode */}
      {selectedTemplate && (
        <TemplateProjectStarter
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          clients={clients}
        />
      )}

      {/* Template Selector (when not preselected) */}
      {!selectedTemplate && templates.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">Start from Template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/projects/new?template=${t.id}`}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 hover:border-purple-500/30 hover:bg-zinc-800/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200 group-hover:text-purple-300 transition-colors">{t.name}</span>
                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{t._count.items} items</span>
                </div>
                {t.description && <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{t.description}</p>}
              </Link>
            ))}
            <Link href="/dashboard/templates" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 border-dashed rounded-lg p-3 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Manage Templates
            </Link>
          </div>
        </div>
      )}

      {/* Manual Form */}
      {!selectedTemplate && (
        <form action={createProject} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Briefcase className="w-4 h-4 text-blue-400" />
            Manual Project Setup
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Project Name *</label>
              <Input name="name" required placeholder="e.g. One-off Event Coverage" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Display Name</label>
              <Input name="projectName" placeholder="Optional public-facing name" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Client *</label>
              <select name="clientId" required className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.clientName}{c.clientNo ? ` (${c.clientNo})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Linked Contract</label>
              <select name="contractId" className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
                <option value="">No contract (one-off)</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNo} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Assign Project Manager (Admin/Operator/TeamLead)</label>
              <select 
                name="assignedUserId" 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
              >
                <option value="">Unassigned</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Target Deadline</label>
              <Input name="targetDeadline" type="date" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Total Value</label>
              <Input name="totalValue" type="number" min="0" step="0.01" defaultValue="0" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-purple-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Currency</label>
              <select name="currency" defaultValue="EGP" className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none">
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Status</label>
            <div className="flex gap-2">
              {[ProjectStatus.DRAFT, ProjectStatus.ACTIVE].map((s) => (
                <label key={s} className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-800 bg-zinc-950 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input type="radio" name="status" value={s} defaultChecked={s === ProjectStatus.DRAFT} className="accent-purple-500" />
                  <span className="text-xs text-zinc-300 font-medium">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Project Story / Brief</label>
            <textarea name="projectStory" rows={3} placeholder="High-level objectives, deliverables, or creative direction..." className="w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-zinc-600 resize-none" />
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <Link href="/dashboard/projects">
              <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</Button>
            </Link>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
              <Plus className="w-4 h-4" /> Create Empty Project
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}