// app/(admin)/superadmin/page.tsx
import AdminStats from "@/components/admin/AdminStats";
import AgencyRegistryTable from "@/components/admin/AgencyRegistryTable";
import { getGlobalSystemData } from "@/lib/admin-actions";

export default async function SuperAdminDashboard() {
  // Fetch real-time system metrics, revenue data, and agency list
  const systemData = await getGlobalSystemData();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 min-h-screen bg-background">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
            System <span className="text-blue-600">Command</span>
          </h1>
          <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.3em]">
            Global Infrastructure Overview • Hurghada Node v3.0
          </p>
        </div>

        {/* SERVER STATUS */}
        <div className="flex items-center gap-2 bg-blue-600/10 text-blue-600 px-4 py-2 rounded-full border border-blue-600/20">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Network: Operational
          </span>
        </div>
      </header>

      {/* SYSTEM METRICS (Now including Revenue and MRR) */}
      <section>
        <AdminStats data={systemData} />
      </section>

      {/* AGENCY REGISTRY */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-black uppercase tracking-tighter italic">
            Active Registries
          </h2>
          <div className="flex gap-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-md">
              {systemData.totalAgencies} Deployments
            </span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-600/10 px-3 py-1 rounded-md border border-blue-600/20">
              {systemData.activeTrials} Trialing
            </span>
          </div>
        </div>

        {/* Table receives agencies with their calculated lifetime revenue */}
        <AgencyRegistryTable agencies={systemData.agencies} />
      </section>

    </div>
  );
}