"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

  const globalFinancials = project.tasks.reduce((acc: any, t: any) => {
    const rentalCost = t.externalRentals.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
    const combinedCost = (t.grossRevenue || 0) + rentalCost;
    const marginAmount = combinedCost * ((t.margin || 0) / 100);
    
    return {
      totalClientPrice: acc.totalClientPrice + (combinedCost + marginAmount),
      totalRentals: acc.totalRentals + rentalCost,
      totalProfit: acc.totalProfit + marginAmount
    };
  }, { totalClientPrice: 0, totalRentals: 0, totalProfit: 0 });

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10 bg-background min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end border-b-4 border-foreground pb-6">
        <div>
          <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-1">Active Production</span>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter mt-2">{project.projectName}</h1>
          <p className="text-muted-foreground font-bold mt-1 uppercase tracking-widest text-xs">
            CLIENT: {project.client?.clientName} // ID: {project.id.slice(-8)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase opacity-50">Total Project Price</p>
          <p className="text-5xl font-black text-blue-600">${globalFinancials.totalClientPrice.toLocaleString()}</p>
          <div className="flex justify-end gap-4 mt-2">
             <p className="text-[10px] font-bold text-red-500 uppercase">Rentals: ${globalFinancials.totalRentals.toLocaleString()}</p>
             <p className="text-[10px] font-bold text-emerald-600 uppercase">Net Profit: ${globalFinancials.totalProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* TASKS ROADMAP */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic">Production Roadmap</h2>

        {project.tasks.map((task: any) => {
          const internalCost = task.grossRevenue || 0;
          const rentalCost = task.externalRentals.reduce((acc: number, r: any) => acc + (r.cost || 0), 0);
          const totalBaseCost = internalCost + rentalCost;
          const profitMargin = totalBaseCost * (task.margin / 100);
          const finalTaskPrice = totalBaseCost + profitMargin;

          return (
            <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="block group">
              <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden hover:border-blue-600 transition-all shadow-sm hover:shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  
                  {/* LEFT: INFO, PROGRESS & TIMELINE */}
                  <div className="lg:col-span-4 p-8 bg-muted/30 border-r border-border flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-black uppercase group-hover:text-blue-600 transition-colors">{task.taskType}</h3>
                        <span className="text-[10px] font-bold px-3 py-1 bg-foreground text-background rounded-full uppercase">{task.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-6 line-clamp-2">{task.description}</p>
                      
                      {/* PROGRESS SECTION */}
                      <div className="mb-6 space-y-2">
                        <div className="flex justify-between items-end">
                          <p className="text-[10px] font-black uppercase opacity-40">Deployment Progress</p>
                          <p className="text-sm font-black italic">{task.progress}%</p>
                        </div>
                        <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-500" 
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* TIMELINE */}
                      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                        <div>
                          <p className="text-[9px] font-black uppercase opacity-40">Deployment Start</p>
                          <p className="text-[11px] font-bold">{new Date(task.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase opacity-40">Project Conclusion</p>
                          <p className="text-[11px] font-bold">{new Date(task.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* ASSIGNEE & TIMESTAMP */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                            {task.assignee?.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase opacity-40 leading-none">Specialist</p>
                            <p className="text-[11px] font-bold">{task.assignee?.name || "Unassigned"}</p>
                          </div>
                        </div>
                        <p className="text-[8px] font-bold opacity-30 uppercase italic">
                          Last Sync: {new Date(task.lastUpdateTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: FINANCIALS & ASSETS */}
                  <div className="lg:col-span-8 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-muted/20 p-6 rounded-3xl border border-border/50">
                      <p className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest">Financial breakdown</p>
                      <div className="space-y-2 text-xs font-bold">
                        <div className="flex justify-between font-medium opacity-60">
                            <span>Internal Cost:</span> <span>${internalCost}</span>
                        </div>
                        <div className="flex justify-between font-medium text-red-500">
                            <span>External Rentals:</span> <span>+ ${rentalCost}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border opacity-60">
                            <span>Total Base Cost:</span> <span>${totalBaseCost}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                            <span>Service Margin ({task.margin}%):</span> <span>+ ${profitMargin.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t-2 border-foreground text-lg font-black italic">
                            <span>CLIENT TOTAL:</span> <span>${finalTaskPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase text-purple-600 mb-4 tracking-widest">Utilized Assets</p>
                        <div className="flex flex-wrap gap-2">
                          {task.assets?.map((asset: any) => (
                            <span key={asset.id} className="px-3 py-1 bg-purple-600/10 text-purple-700 text-[10px] font-bold rounded-lg border border-purple-600/20">
                              {asset.assetName}
                            </span>
                          ))}
                          {(!task.assets || task.assets.length === 0) && (
                             <p className="text-[10px] italic opacity-40 font-bold uppercase">No hardware provisioned</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}