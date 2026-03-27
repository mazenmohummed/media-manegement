"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, CheckCircle2, Globe, User } from "lucide-react";
import Link from "next/link";
import { Prisma } from "@prisma/client";

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: { 
    client: true, 
    tasks: { include: { taskExpenses: true, assignee: true, assets: true } } 
  }
}>;

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) setProject(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchProject();
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase tracking-widest text-blue-600">Loading Production Data...</div>;
  if (!project) return <div className="p-20 text-center font-bold uppercase">Project not found.</div>;

  const globalFinancials = project.tasks.reduce((acc: any, t: any) => {
    const rentalCost = (t.taskExpenses ?? []).reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
    const internalBase = t.internalCost || 0;
    const combinedCost = internalBase + rentalCost;
    const marginAmount = combinedCost * ((t.margin || 0) / 100);
    
    return {
      totalClientPrice: acc.totalClientPrice + (combinedCost + marginAmount),
      totalRentals: acc.totalRentals + rentalCost,
      totalProfit: acc.totalProfit + marginAmount
    };
  }, { totalClientPrice: 0, totalRentals: 0, totalProfit: 0 });

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10 bg-background min-h-screen">
      
      {/* 1. THE MISSING PIECE: CSS PRINT ENGINE */}
      <style jsx global>{`
        @media print {
          /* Hide everything by default */
          body * { 
            visibility: hidden; 
            background: none !important; 
          }
          /* Show only the main container */
          .printable-invoice, .printable-invoice * { 
            visibility: visible; 
          }
          .printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Force colors to show in PDF */
          .text-blue-600 { color: #2563eb !important; -webkit-print-color-adjust: exact; }
          .bg-blue-600 { background-color: #2563eb !important; -webkit-print-color-adjust: exact; }
          
          .no-print { display: none !important; }
          @page { margin: 15mm; }
        }
      `}</style>

      {/* 2. WRAP EVERYTHING IN PRINTABLE CLASS */}
      <div className="printable-invoice space-y-10">
        
        {/* HEADER ACTIONS (Hidden on Print) */}
        <div className="flex justify-between items-center print:hidden no-print">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 shadow-lg transition-all">
            <Printer size={14} /> Print Invoice PDF
          </button>
        </div>

        {/* HEADER SECTION */}
        <div className="flex justify-between items-end border-b-4 border-foreground pb-6">
          <div>
            <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-1">Active Production</span>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter mt-2">{project.projectName}</h1>
            <p className="text-muted-foreground font-bold mt-1 uppercase tracking-widest text-xs">
              CLIENT: {project.client?.clientName} // NO: {project.projectNo || project.id.slice(-8).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase opacity-50">Total Project Price</p>
            <p className="text-5xl font-black text-blue-600">${globalFinancials.totalClientPrice.toLocaleString()}</p>
            <div className="flex justify-end gap-4 mt-2 print:hidden no-print">
               <p className="text-[10px] font-bold text-red-500 uppercase">Rentals: ${globalFinancials.totalRentals.toLocaleString()}</p>
               <p className="text-[10px] font-bold text-emerald-600 uppercase">Net Profit: ${globalFinancials.totalProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* TASKS ROADMAP */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase italic">Production Roadmap</h2>

          {project.tasks.map((task: any) => {
            const internalCost = task.internalCost || 0; 
            const rentalCost = (task.taskExpenses ?? []).reduce((acc: number, r: any) => acc + (r.cost || 0), 0);
            const totalBaseCost = internalCost + rentalCost;
            const profitMargin = totalBaseCost * (task.margin / 100);
            const finalTaskPrice = totalBaseCost + profitMargin;

            return (
              <div key={task.id} className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm mb-4">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  
                  {/* LEFT: INFO */}
                  <div className="lg:col-span-4 p-8 bg-muted/30 border-r border-border">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-black uppercase">{task.taskType}</h3>
                      <span className="text-[10px] font-bold px-3 py-1 bg-foreground text-background rounded-full uppercase">{task.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{task.description}</p>
                    <div className="text-[10px] font-bold uppercase opacity-40">
                      Timeline: {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  {/* RIGHT: FINANCIALS */}
                  <div className="lg:col-span-8 p-8 flex justify-between items-cente ">
                    <div className="space-y-1 print:hidden no-print">
                      <p className="text-[10px] font-black uppercase text-blue-600">Financial breakdown</p>
                      <div className="text-xs font-bold space-y-1">
                        <p className="opacity-60">Base + Rentals: ${(internalCost + rentalCost).toLocaleString()}</p>
                        <p className="text-emerald-600">Margin ({task.margin}%): +${profitMargin.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase opacity-30">Client Total</p>
                      <p className="text-3xl font-black italic tracking-tighter">${finalTaskPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER (Only shows in Print) */}
        <div className="hidden print:block pt-10 border-t border-dashed border-border text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
                Digital Invoice Generated on {new Date().toLocaleString()} <br />
                Agency Management System - Hurghada Operations
            </p>
        </div>
      </div>
    </div>
  );
}