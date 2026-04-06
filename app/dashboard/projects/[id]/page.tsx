"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Printer, Trash2, Loader2, 
  Calendar, User as UserIcon, ShieldCheck, 
  ChevronRight, CreditCard, Layout, 
  HardDrive
} from "lucide-react";

// Types derived from your schema
type ProjectWithRelations = any; // You can use your Prisma ProjectGetPayload here

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Permanently delete this project and all associated tasks?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/dashboard/projects");
      else alert("Failed to delete project");
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="animate-spin mx-auto text-blue-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Syncing Production Data</p>
      </div>
    </div>
  );

  if (!project) return <div className="p-20 text-center font-bold uppercase">Project not found.</div>;

  // Global Financial Calculation based on your new formula
  const globalStats = project.tasks.reduce((acc: any, t: any) => {
    const internal = t.internalCost || 0;
    const marginAmount = t.marginAmount || 0;
    const expenses = (t.taskExpenses || []).reduce((sum: number, e: any) => sum + (e.cost || 0), 0);
    
    return {
      revenue: acc.revenue + (internal + marginAmount + expenses),
      profit: acc.profit + t.taskNetProfit,
      expenses: acc.expenses + expenses
    };
  }, { revenue: 0, profit: 0, expenses: 0 });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-8 border-border/50">
        <button onClick={() => router.back()} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> Back
        </button>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => router.push(`/dashboard/projects/${project.id}/invoice`)} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
          >
            <Printer size={14} /> Generate Invoice
          </button>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="group p-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
          </button>
        </div>
      </div>

      {/* PROJECT BRANDING & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full mb-4">
            <ShieldCheck size={12} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Verified Production</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">
            {project.projectName}
          </h1>
          <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-2 bg-muted px-3 py-1 rounded-md text-foreground">
              <UserIcon size={14} className="text-blue-600" /> {project.client?.clientName}
            </span>
            <span className="flex items-center gap-2 border border-border px-3 py-1 rounded-md">
              REF: {project.projectNo}
            </span>
          </div>
        </div>

        <div className="bg-foreground text-background p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase opacity-60 mb-1">Estimated Project Value</p>
            <h2 className="text-5xl font-black tracking-tighter mb-4">
              ${globalStats.revenue.toLocaleString()}
            </h2>
            <div className="grid grid-cols-2 gap-4 border-t border-background/20 pt-4">
              <div>
                <p className="text-[9px] font-black uppercase opacity-40">Est. Profit</p>
                <p className="text-lg font-bold text-emerald-400">+${globalStats.profit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase opacity-40">Direct Expenses</p>
                <p className="text-lg font-bold text-rose-400">-${globalStats.expenses.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <Layout className="absolute -right-10 -bottom-10 w-40 h-40 opacity-5 group-hover:rotate-12 transition-transform duration-1000" />
        </div>
      </div>

      {/* TASKS LIST */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Production Roadmap</h2>
          <span className="text-[10px] font-black uppercase opacity-40">{project.tasks.length} Tasks Scheduled</span>
        </div>

        <div className="grid gap-6">
          {project.tasks.map((task: any) => {
            const expenses = (task.taskExpenses || []).reduce((sum: number, e: any) => sum + (e.cost || 0), 0);
            return (
              <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="group relative">
                <div className="bg-card border border-border rounded-[2rem] p-6 md:p-8 hover:border-blue-600/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* TASK HEADER & STATUS */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded">
                          {task.taskNo}
                        </span>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${
                          task.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                        {task.taskType}
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                          {task.assignees?.map((a: any) => (
                            <div key={a.id} className="w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden" title={a.name}>
                              {a.image ? <img src={a.image} alt={a.name} /> : a.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] font-bold uppercase opacity-40">Team Assigned</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                      {task.assets?.length > 0 ? (
                        task.assets.map((asset: any) => (
                          <div key={asset.id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-[9px] font-black uppercase opacity-70">
                            <HardDrive size={10} /> {asset.assetName}
                          </div>
                        ))
                      ) : (
                        <p className="text-[9px] font-bold opacity-30 uppercase">No assets linked</p>
                      )}
                    </div>
                    </div>

                    {/* PROGRESS & TIMELINE */}
                    <div className="lg:col-span-4 space-y-4 px-2 md:px-8 border-l border-r border-border/50">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span>Completion</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-1000 group-hover:bg-blue-400" 
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 opacity-60">
                          <Calendar size={12} />
                          <span className="text-[10px] font-bold">{new Date(task.startDate).toLocaleDateString()}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-20" />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold">{new Date(task.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* FINANCIAL SNAPSHOT */}
                    <div className="lg:col-span-4 bg-muted/30 rounded-2xl p-5 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[9px] font-black uppercase opacity-40">Client Invoice Amount</p>
                        <CreditCard size={12} className="opacity-20" />
                      </div>
                      <p className="text-3xl font-black tracking-tighter text-foreground mb-2">
                        ${task.totalValue.toLocaleString()}
                      </p>
                      <div className="flex justify-between text-[9px] font-black uppercase">
                        <span className="text-emerald-600">Net Profit: ${task.taskNetProfit}</span>
                        <span className="text-rose-600">Costs: ${task.internalCost + expenses}</span>
                      </div>
                    </div>

                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}