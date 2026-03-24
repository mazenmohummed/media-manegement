import { db } from "lib/db"; // Adjust based on your prisma client location
import { Project, Client, Task } from "@prisma/client";
import Link from "next/link";
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ExternalLink, 
  Briefcase,
  CheckCircle2,
  Clock
} from "lucide-react";

async function getProjects() {
  return await db.project.findMany({
    include: {
      client: true,
      tasks: {
        include: {
          externalRentals: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Command Center: Projects</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Active Deployments & Financial Tracking</p>
        </div>
        <Link 
          href="/dashboard/projects/new" 
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
        >
          <PlusCircle size={16} /> New Deployment
        </Link>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border p-6 rounded-[2rem] flex flex-col justify-center">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Pipeline</p>
          <p className="text-3xl font-black italic">{projects.length} Entities</p>
        </div>
        <div className="bg-card border p-6 rounded-[2rem] flex flex-col justify-center border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Gross Revenue</p>
          <p className="text-3xl font-black italic text-emerald-600">
            ${projects.reduce((acc, p) => acc + p.totalValue, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card border p-6 rounded-[2rem] flex flex-col justify-center">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tasks Pending</p>
          <p className="text-3xl font-black italic">{projects.reduce((acc, p) => acc + p.tasks.length, 0)} Units</p>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-card border rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/5">
        <div className="p-6 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 bg-background border px-4 py-2 rounded-xl w-full max-w-md">
            <Search size={14} className="text-muted-foreground" />
            <input 
              placeholder="Filter Ledger..." 
              className="bg-transparent border-none outline-none text-xs font-bold uppercase w-full"
            />
          </div>
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Filter size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted/30">
                <th className="px-8 py-5">Project / Status</th>
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5">Workflow</th>
                <th className="px-8 py-5 text-right">Invoice Value</th>
              </tr>
            </thead>
            <tbody className="divide-y border-t">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-muted/10 transition-colors group cursor-pointer">
                  <td className="px-8 py-6">
                    <Link href={`/dashboard/projects/${project.id}`}>
                      <div className="flex flex-col">
                        <span className="font-black text-sm uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                          {project.projectName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase ${
                            project.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}>
                            {project.status}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground">{project.projectNo || 'PRJ-REF'}</span>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold uppercase">{project.client.clientName}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex -space-x-2">
                      {project.tasks.map((task) => (
                        <div 
                          key={task.id} 
                          title={task.taskType}
                          className="w-8 h-8 rounded-full border-2 border-background bg-blue-100 flex items-center justify-center text-[8px] font-black text-blue-600 uppercase"
                        >
                          {task.taskType.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="font-black italic text-lg tracking-tighter">
                      ${project.totalValue.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-black uppercase text-muted-foreground">{project.invoiceStatus}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {projects.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Briefcase className="text-muted-foreground opacity-20" size={32} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">No active deployments in ledger</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}