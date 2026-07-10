"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectInvoicePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectInvoice() {
      try {
        const res = await fetch(`/api/projects/${id}/invoice`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    }
    if (id) fetchProjectInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center font-black animate-pulse text-blue-600 uppercase tracking-widest flex items-center gap-2 text-sm">
        <Loader2 className="animate-spin" size={16} /> Generating Digital Statement Ledger...
      </div>
    </div>
  );
  
  if (!project) return <div className="p-12 font-bold uppercase text-center text-xs tracking-widest text-muted-foreground">Invoice parameters missing or invalid.</div>;

  const invoiceTotal = project.calculatedTotal || project.totalValue || 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 md:p-12 print:p-0 print:bg-white">
      
      {/* ─── INJECTED GLOBAL PRINT OVERRIDES ─── */}
      <style jsx global>{`
        @media print {
          /* Force hide ALL parent dashboard elements, sidebar wrappers, and layout headers */
          html, body, main, div, nav, aside {
            background: transparent !important;
            box-shadow: none !important;
          }
          
          /* Target your layout's main wrapper tree to prevent clipping or offsetting */
          body * {
            visibility: hidden !important;
          }
          
          /* Only display the primary print container and everything contained within it */
          #isolated-invoice-print-area, #isolated-invoice-print-area * {
            visibility: visible !important;
          }
          
          /* Dock the printable block perfectly to full dimensions at the very top-left corner */
          #isolated-invoice-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background-color: white !important;
            color: black !important;
          }

          /* Prevent table columns from fracturing ungracefully */
          tr, td, th {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ─── ACTION NAVBAR (HIDDEN ON PRINT) ─── */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8 pb-4 border-b border-border print:hidden">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft size={14} /> Back to Desk
        </button>
        
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <Printer size={14} /> Print Invoice / Save PDF
        </button>
      </div>

      {/* ─── INVOICE SHEET CONTAINER ─── */}
      <div 
        id="isolated-invoice-print-area" 
        className="max-w-4xl mx-auto bg-card border border-border rounded-[2.5rem] p-8 sm:p-12 md:p-16 shadow-2xl print:bg-white print:p-0 print:border-none print:shadow-none print:rounded-none"
      >
        
        {/* HEADER BRANDING */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4 print:flex-row print:justify-between print:items-start">
          <div className="space-y-2">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-foreground print:text-black">
              {project.agency?.agencyName || "AGENCY WORKSPACE"}
            </h1>
            <p className="text-xs text-muted-foreground font-mono font-medium print:text-neutral-600">{project.agency?.address || ""}</p>
          </div>
          <div className="sm:text-right space-y-1 print:text-right">
            <span className="text-[9px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-500 border border-blue-600/20 px-2.5 py-1 rounded-md inline-block print:border-neutral-300 print:text-black">
              Statement Invoice
            </span>
            <p className="text-lg font-black font-mono mt-2 text-foreground print:text-black">{project.invoiceNo || `INV-${project.projectNo || "AUTO"}`}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest print:text-neutral-500">
              Issued: {project.createdAt ? new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : "N/A"}
            </p>
          </div>
        </div>

        {/* METADATA TARGETS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-b border-border py-8 mb-12 print:grid-cols-2 print:border-neutral-200">
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 italic print:text-neutral-500">Billed Destination</p>
            <p className="text-base font-black uppercase tracking-tight text-foreground print:text-black">{project.client?.clientName}</p>
            
          </div>
          <div className="sm:text-right print:text-right">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 italic print:text-neutral-500">Project Context</p>
            <p className="text-base font-black uppercase tracking-tight text-foreground print:text-black">{project.projectName}</p>
            <p className="text-xs font-bold text-muted-foreground mt-0.5 print:text-neutral-600">Status Tracking Position: <span className="text-blue-600 font-mono print:text-black">{project.invoiceStatus || "SENT"}</span></p>
          </div>
        </div>

        {/* LINE ITEMS TABLE */}
        <div className="space-y-4 mb-12">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic print:text-neutral-500">Itemized Production Log</p>
          <div className="border border-border rounded-2xl overflow-hidden bg-muted/20 print:border-neutral-200 print:bg-transparent">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[9px] font-black uppercase tracking-widest text-muted-foreground print:border-neutral-200 print:text-black">
                  <th className="p-4 pl-6">Line Item / Task Segment Description</th>
                  <th className="p-4 text-right pr-6">Cost Valuation (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs font-bold text-foreground print:divide-neutral-200 print:text-black">
                {project.tasks && project.tasks.length > 0 ? (
                  project.tasks.map((task: any) => (
                    <tr key={task.id} className="print:border-b print:border-neutral-100">
                      <td className="p-4 pl-6 font-black uppercase tracking-tight">
                        {task.taskType || "General Production Allotment"}
                      </td>
                      <td className="p-4 text-right pr-6 font-mono text-sm text-foreground print:text-black">
                        ${(task.totalInvoice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-muted-foreground uppercase tracking-widest text-[10px] font-black">
                      No separate task segments aggregated. Base contract value model applied.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTALS OVERVIEW BREAKDOWN */}
        <div className="flex justify-end">
          <div className="w-full sm:max-w-sm border border-border bg-muted/20 rounded-2xl p-6 space-y-4 print:border-neutral-200 print:max-w-[320px]">
            <div className="flex justify-between items-center text-xs opacity-60 font-bold print:text-black print:opacity-100">
              <span className="uppercase tracking-widest">Gross Subtotal</span>
              <span className="font-mono">${invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-border border-dashed my-2 print:border-neutral-200"></div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-500 print:text-black italic">Total Balance Due</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase print:text-neutral-500">Currency standard: USD</p>
              </div>
              <p className="text-2xl font-black italic tracking-tighter text-foreground font-mono print:text-black">
                ${invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER METADATA */}
        <footer className="mt-20 pt-8 border-t border-border text-center print:border-neutral-200">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 italic print:text-neutral-400">
            Generated via {project.agency?.agencyName || "Workspace"} Management Portal
          </p>
        </footer>

      </div>
    </div>
  );
}