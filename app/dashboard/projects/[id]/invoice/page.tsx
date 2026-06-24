"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, CreditCard } from "lucide-react";
import { Prisma } from "@prisma/client";

// Define the type to match your specific schema fields
type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: { 
    client: true, 
    agency: true, 
    tasks: true 
  }
}>;

export default function ProjectInvoicePage() {
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

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-blue-600 uppercase tracking-widest">
      Generating Invoice...
    </div>
  );
  
  if (!project) return <div className="p-20 text-center font-bold">Invoice not found.</div>;

  /**
   * NEW FINANCIAL LOGIC:
   * We no longer calculate margin/expenses on the fly here.
   * We trust the 'totalInvoice' field from your Task model.
   */
  const grandTotal = project.tasks.reduce((acc, task) => acc + (task.totalInvoice || 0), 0);

  return (
    <div className="invoice-wrapper min-h-screen mx-auto bg-slate-50 md:p-4">
      
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0 !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 165mm !important;
            padding: 0mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
          .bg-slate-900 { 
            background-color: #0f172a !important; 
            print-color-adjust: exact !important; 
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ACTION BAR */}
      <div className="no-print flex justify-between  items-center my- bg-white p-4 rounded-2xl border border-slate-200 max-w-3xl mx-auto shadow-sm">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-black transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg">
          <Printer size={14} /> Print Invoice
        </button>
      </div>

      <div className="printable-area max-w-5xl w-fit mx-auto mt-10 bg-white p-8 md:p-16 shadow-2xl border border-slate-100 space-y-2">
        
        {/* HEADER: AGENCY INFO */}
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className="bg-slate-900 text-white px-2 py-1 inline-block text-[9px] font-black uppercase tracking-[0.3em]">
              Official Document
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                {project.agency?.agencyName || "Agency Name"}
              </h1>
              <p className="text-[11px] font-bold text-slate-500 uppercase mt-2 tracking-widest">
                {project.agency?.address}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-6xl font-black text-slate-200 italic tracking-tighter leading-none">
              #{project.projectNo || project.id.slice(-5).toUpperCase()}
            </h2>
            <p className="text-[10px] font-black text-slate-900 uppercase mt-4 tracking-tighter">
              Issue Date: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="h-[2px] bg-slate-900 w-full" />

        {/* RECIPIENT & PROJECT INFO */}
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-[9px] font-black text-blue-600 uppercase mb-2 tracking-[0.2em]">Bill To</p>
            <h3 className="text-2xl font-black uppercase italic text-slate-900">{project.client?.clientName}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Client Ref: {project.client?.id.slice(-8)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-blue-600 uppercase mb-2 tracking-[0.2em]">Project Title</p>
            <h3 className="text-2xl font-black uppercase italic text-slate-900">{project.projectName}</h3>
          </div>
        </div>

        {/* SERVICES TABLE */}
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em]">Description of Services</th>
                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-right">Amount (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.tasks.map((task) => (
                <tr key={task.id} className="group">
                  <td className="p-2">
                    <p className="text-base font-black uppercase text-slate-900 tracking-tight">
                      {task.taskType} PRODUCTION
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter leading-relaxed max-w-md">
                      Comprehensive handling of {task.taskType.toLowerCase()} resources and production management.
                    </p>
                  </td>
                  <td className="p-2 text-right align-top">
                    <span className="text-lg font-black text-slate-900">
                      ${(task.totalInvoice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY SECTION */}
        <div className="flex pt-2">
          {/* mx-auto centers this block horizontally inside the parent flex container */}
          <div className="w-full md:w-1/2 mx-auto bg-slate-900 p-6  rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            
            {/* Cleaned up internal layout using space-y-6 instead of huge margins */}
            <div className="relative z-10 space-y-2">
              
              <div className="flex w-full m-auto opacity-50">
                <div className="mx-auto ">
                <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                </div>
                <div className="mx-auto">
                <span className="text-sm font-bold">${grandTotal.toLocaleString()}</span>
                </div>
              </div>
              


              <div className="flex w-full">
                <div className="mx-auto">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-blue-400">Total Balance Due</p>
                  <p className="text-xs opacity-40 font-bold uppercase tracking-tighter">Currency: USD</p>
                </div>
                <div className="mx-auto">
                <span className="text-3xl font-black italic tracking-tighter">
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                </div>
              </div>

            </div>
            
          
          </div>
        </div>

        <footer className="pt-20 text-center">
          <div className="inline-block border-t border-slate-100 pt-8 px-12">
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-300">
              Generated via {project.agency?.agencyName || "Agency"} Management Portal
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}