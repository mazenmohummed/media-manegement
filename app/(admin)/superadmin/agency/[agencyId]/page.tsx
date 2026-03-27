import { db } from "@/lib/db";
import { toggleAgencyStatus } from "@/lib/admin-actions";
import { redirect } from "next/navigation";
import { ShieldAlert, Users, FolderKanban, ArrowLeft, Globe, ReceiptText, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function ManageAgencyPage({ 
  params 
}: { 
  params: Promise<{ agencyId: string }> 
}) {
  const { agencyId } = await params;

  // 1. Fetch Agency with Relations + Invoice History
  const agency = await db.agency.findUnique({
    where: { id: agencyId },
    include: {
      subscription: true,
      agencyInvoices: {
        orderBy: { createdAt: 'desc' }
      },
      _count: { select: { users: true, projects: true } }
    }
  });

  if (!agency) redirect("/superadmin");

  // 2. Financial Calculations
  const totalPaid = agency.agencyInvoices
    .filter(inv => inv.status === "PAID")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentStatus = agency.subscription?.status || "INACTIVE";
  const nextStatus = currentStatus === "ACTIVE" ? "CANCELED" : "ACTIVE";

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-10 min-h-screen bg-background">
      
      {/* NAVIGATION */}
      <Link 
        href="/superadmin" 
        className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 transition-colors text-[10px] font-black uppercase tracking-[0.2em] w-fit"
      >
        <ArrowLeft size={14} /> Back to Command
      </Link>

      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
              Manage <span className="text-blue-600">{agency.agencyName}</span>
            </h1>
            <div className={`px-3 py-1 border rounded-lg ${
              currentStatus === "ACTIVE" ? "bg-emerald-600/10 border-emerald-600/20 text-emerald-600" : "bg-rose-600/10 border-rose-600/20 text-rose-600"
            }`}>
               <span className="text-[10px] font-black uppercase tracking-widest">{currentStatus}</span>
            </div>
          </div>
          <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
            <Globe size={12} /> ID: {agency.id} • Hurghada Node
          </p>
        </div>

        {/* KILL SWITCH */}
        <form action={async () => {
          "use server";
          await toggleAgencyStatus(agency.id, nextStatus);
        }}>
          <button className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg active:scale-95 border ${
            currentStatus === "ACTIVE"
            ? "bg-rose-600/10 text-rose-600 border-rose-600/20 hover:bg-rose-600 hover:text-white"
            : "bg-emerald-600/10 text-emerald-600 border-emerald-600/20 hover:bg-emerald-600 hover:text-white"
          }`}>
            <ShieldAlert size={16} />
            {currentStatus === "ACTIVE" ? "Terminate Infrastructure" : "Reactivate Node"}
          </button>
        </form>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-8 bg-card border border-border rounded-[2rem] space-y-2">
           <Users className="text-blue-600" size={20} />
           <h3 className="text-3xl font-black tracking-tighter italic">{agency._count.users}</h3>
           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Operators</p>
        </div>
        <div className="p-8 bg-card border border-border rounded-[2rem] space-y-2">
           <FolderKanban className="text-blue-600" size={20} />
           <h3 className="text-3xl font-black tracking-tighter italic">{agency._count.projects}</h3>
           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Projects</p>
        </div>
        <div className="p-8 bg-card border border-border rounded-[2rem] space-y-2">
           <ReceiptText className="text-emerald-500" size={20} />
           <h3 className="text-3xl font-black tracking-tighter italic">${totalPaid.toLocaleString()}</h3>
           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">LTV Revenue</p>
        </div>
        <div className="p-8 bg-blue-600 text-white rounded-[2rem] space-y-2 shadow-xl shadow-blue-500/20">
           <div className="text-[9px] font-black uppercase tracking-widest opacity-70">Current Plan</div>
           <h3 className="text-3xl font-black tracking-tighter uppercase italic">
             {agency.subscription?.plan || "FREE"}
           </h3>
        </div>
      </div>

      {/* INVOICE HISTORY TABLE */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-black uppercase tracking-tighter italic">Billing History</h2>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{agency.agencyInvoices.length} Invoices Found</span>
        </div>

        <div className="bg-card border border-border rounded-[2rem] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Plan/Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {agency.agencyInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase px-2 py-1 bg-muted rounded text-muted-foreground">
                      {invoice.plan} • {invoice.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black italic">${invoice.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full border ${
                      invoice.status === "PAID" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {invoice.pdfUrl && (
                      <a 
                        href={invoice.pdfUrl} 
                        target="_blank" 
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-[10px] font-black uppercase"
                      >
                        PDF <ExternalLink size={10} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {agency.agencyInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                    No payment history recorded for this node
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SYSTEM LOGS AREA */}
      <div className="p-8 border border-dashed border-border rounded-[2rem] opacity-50">
        <p className="text-[9px] font-mono text-center uppercase tracking-[0.4em]">
          End of system registry for {agency.agencyName} • Secure Connection Established
        </p>
      </div>

    </div>
  );
}