"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) setProject(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-black animate-pulse">LOADING PRODUCTION DATA...</div>;
  if (!project) return <div className="p-20 text-center">Project not found.</div>;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end border-b-4 border-foreground pb-6">
        <div>
          <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-1">Active Production</span>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter mt-2">{project.projectName}</h1>
          <p className="text-muted-foreground font-bold mt-1">CLIENT: {project.client.clientName} / {project.id}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase opacity-50">Total Project Value</p>
          <p className="text-4xl font-black">${project.totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-[2rem] border border-border">
          <p className="text-[10px] font-black uppercase opacity-40">Target Deadline</p>
          <p className="text-xl font-bold">{new Date(project.targetDeadline).toLocaleDateString()}</p>
        </div>
        <div className="bg-card p-6 rounded-[2rem] border border-border">
          <p className="text-[10px] font-black uppercase opacity-40">Cloud Assets</p>
          <a href={project.cloudLink} target="_blank" className="text-blue-600 font-bold hover:underline truncate block">
            {project.cloudLink || "No link provided"}
          </a>
        </div>
        <div className="bg-card p-6 rounded-[2rem] border border-border">
          <p className="text-[10px] font-black uppercase opacity-40">Invoice Status</p>
          <span className="text-xl font-bold uppercase italic">{project.invoiceStatus}</span>
        </div>
      </div>

      {/* TASKS / DEPARTMENTS */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic italic">Production Roadmap</h2>
        {project.tasks.map((task: any) => (
          <div key={task.id} className="bg-card rounded-[2.5rem] border border-border overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* LEFT: Task Info */}
              <div className="lg:col-span-4 p-8 bg-muted/30 border-r border-border">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-black uppercase">{task.taskType}</h3>
                  <span className="text-[10px] font-bold px-3 py-1 bg-foreground text-background rounded-full">{task.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{task.description}</p>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-40">Specialist</p>
                    <p className="font-bold">{task.assignee?.name || "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-40">Timeline</p>
                    <p className="text-xs font-medium">
                      {new Date(task.startDate).toLocaleDateString()} → {new Date(task.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT: Financials & Assets */}
              <div className="lg:col-span-8 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest">Financial breakdown</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="opacity-50">Gross Revenue:</span> <b>${task.grossRevenue}</b></div>
                    <div className="flex justify-between text-sm"><span className="opacity-50">Target Margin:</span> <b>{task.margin}%</b></div>
                    <div className="pt-2 border-t border-border flex justify-between font-black">
                      <span>EST. PROFIT:</span> 
                      <span className="text-emerald-600">${(task.grossRevenue * (task.margin / 100)).toFixed(2)}</span>
                    </div>
                  </div>

                  {task.externalRentals.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="text-[9px] font-black uppercase opacity-40 mb-2">External Rentals</p>
                      {task.externalRentals.map((r: any) => (
                        <div key={r.id} className="flex justify-between text-xs font-medium">
                          <span>{r.itemName}</span>
                          <span>${r.cost}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-purple-600 mb-4 tracking-widest">Utilized Assets</p>
                  <div className="flex flex-wrap gap-2">
                    {task.assets.map((asset: any) => (
                      <span key={asset.id} className="px-3 py-1 bg-purple-600/10 text-purple-700 text-[10px] font-bold rounded-lg border border-purple-600/20">
                        {asset.assetName}
                      </span>
                    ))}
                    {task.assets.length === 0 && <p className="text-xs italic opacity-40">No internal assets assigned.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}