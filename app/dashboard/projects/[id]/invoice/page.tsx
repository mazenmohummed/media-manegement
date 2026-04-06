"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, CreditCard, Building2 } from "lucide-react";
import { Prisma } from "@prisma/client";

// 1. Updated Type to include Agency
type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: { 
    client: true, 
    agency: true, // Added Agency relation
    tasks: { include: { taskExpenses: true } } 
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
        // Ensure your API route /api/projects/[id] includes { agency: true } in the Prisma query
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) setProject(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchProject();
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-blue-600 uppercase tracking-widest">Generating Invoice...</div>;
  if (!project) return <div className="p-20 text-center font-bold">Invoice not found.</div>;

  const totals = project.tasks.reduce((acc, t) => {
    const expenses = (t.taskExpenses ?? []).reduce((sum, r) => sum + (r.cost || 0), 0);
    const subtotal = (t.internalCost || 0) + expenses;
    const margin = subtotal * ((t.margin || 0) / 100);
    const clientPrice = subtotal + margin;

    return {
      grandTotal: acc.grandTotal + clientPrice,
      subtotal: acc.subtotal + subtotal
    };
  }, { grandTotal: 0, subtotal: 0 });

  return (
    <div className="invoice-wrapper min-h-screen bg-slate-50 md:p-4">
      
      <style jsx global>{`
  @media print {
    /* 1. Reset Paper and Force Zero Margins */
    @page {
      size: A4;
      margin: 0 !important; 
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 0 !important; /* Exact A4 Width */
      height: 100%;
      background: white !important;
    }

    /* 2. Total Visibility Override */
    body * {
      visibility: hidden;
    }

    /* 3. The Absolute Zero Fix */
    .printable-area, .printable-area * {
      visibility: visible;
    }

    .printable-area {
      position: fixed  !important; 
      top: 0 !important;
      left: 0 !important; /* Pins to the absolute left edge */
      width: 210mm !important; /* Matches paper width exactly */
      max-width: none !important;
      margin: 0 !important; 
      padding: 15mm !important; /* Professional internal breathing room */
      box-shadow: none !important;
      border: none !important;
      background: white !important;
    }

    /* 4. Persistence of Background Colors */
    .bg-slate-900 {
      background-color: #0f172a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .bg-slate-50 {
      background-color: #f8fafc !important;
      -webkit-print-color-adjust: exact !important;
    }

    /* Hide the UI bar */
    .no-print {
      display: none !important;
    }

    /* Support for long invoices */
    .break-inside-avoid {
      break-inside: avoid;
    }
  }
`}</style>

      {/* ACTION BAR */}
      <div className="no-print flex justify-between items-center mb-12 bg-slate-100 p-4 rounded-2xl border border-slate-200">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-bold uppercase text-slate-600 hover:text-black transition-colors">
          <ArrowLeft size={16} /> Back to Production
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">
          <Printer size={16} /> Export PDF
        </button>
      </div>

      <div className="printable-area max-w-5xl m-2  bg-white p-4 md:p-8 shadow-2xl md:rounded-[3rem] border border-slate-100 space-y-1">
        
        {/* DYNAMIC HEADER */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="bg-slate-900 text-white px-3 py-1 inline-block text-[10px] font-black uppercase tracking-widest">
              Commercial Invoice
            </div>
            {/* Dynamic Agency Name */}
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-600">
                {project.agency?.agencyName || ""}
            </h1>
            <div className="text-[12px] font-bold text-slate-600 uppercase leading-relaxed">
              {/* Dynamic Address & Agency No */}
              {project.agency?.address || ""}<br />
              Reg: #{project.agency?.agencyNo || "N/A"} | <span className="text-slate-600">{project.agency?.operatorName || ""}</span>
            </div>
          </div>
          <div className="text-right">
            {/* Dynamic Project Number with /# prefix */}
            <h2 className="text-5xl font-black text-slate-600 italic tracking-tighter">
                {project.projectNo ? `${project.projectNo}` : `${project.id.slice(-5).toUpperCase()}`}
            </h2>
            <p className="text-[11px] font-black text-slate-500 uppercase mt-2">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <hr className="border-t-2 border-slate-200" />

        {/* DETAILS */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-blue-700 uppercase mb-3 tracking-widest">Recipient</p>
            <h3 className="text-xl font-black uppercase italic text-slate-600">{project.client?.clientName}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase">ID: {project.client?.id.slice(-8)}</p>
          </div>
          <div className="p-2 border border-slate-100 rounded-2xl flex flex-col justify-center text-right">
            <p className="text-[10px] font-black text-blue-700 uppercase mb-1 tracking-widest">Project</p>
            <h3 className="text-xl font-black uppercase italic text-slate-600">{project.projectName}</h3>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Services Rendered</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-right">Total (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {project.tasks.map((task) => {
                const sub = (task.internalCost || 0) + (task.taskExpenses ?? []).reduce((s, r) => s + (r.cost || 0), 0);
                const total = sub + (sub * (task.margin / 100));
                
                return (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-6 px-6">
                      <p className="text-sm font-black uppercase text-slate-600">{task.taskType} Production</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                        Deployment of personnel and production assets
                      </p>
                    </td>
                    <td className="py-6 px-6 text-right font-black text-slate-600">
                      ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

       {/* TOTALS */}
        <div className="flex justify-end">
          {/* Added 'print-bg-fix' as a hook for our CSS above if needed, 
              but the bg-slate-900 class is now forced in our style block */}
          <div className="w-full md:w-1/3 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
            <div className="space-y-1">
              <div className=" flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest">Total Due</span>
                <span className="text-3xl font-black italic">
                  ${totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

       
        <footer className="pt-12 text-center opacity-30">
          <p className="text-[9px] font-bold uppercase tracking-[0.4em]">
            This is a computer generated document
          </p>
        </footer>
      </div>
    </div>
  );
}