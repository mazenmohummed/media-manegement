import React from "react";
import Link from "next/link";
import { 
  Users, 
  UserCheck, 
  Building2, 
  Wrench, 
  FileText, 
  ArrowUpRight, 
  Calendar, 
  Briefcase,
  ShieldAlert,
  Clock
} from "lucide-react";
import { db } from "@/lib/db";

export default async function OrganizationHRPage() {
  // Fetch summary counts and data from your Prisma database using db
  const [
    totalClients,
    totalEmployees,
    departments,
    activeAssets,
    vendorsCount,
    recentLeaves,
    recentAttendance
  ] = await Promise.all([
    db.client.count(),
    db.user.count({ where: { isActive: true } }),
    db.department.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    }),
    db.asset.count({ where: { availabilityStatus: "AVAILABLE" } }),
    db.vendor.count({ where: { status: "ACTIVE" } }),
    db.leave.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true }
    }),
    db.attendanceLog.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { user: true }
    })
  ]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization & HR Hub</h1>
          <p className="text-sm text-slate-500">
            Manage your personnel directories, departments, physical assets, and vendors from one central place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/employees/new"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
          >
            Add Employee
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Employees"
          value={totalEmployees}
          icon={UserCheck}
          href="/dashboard/employees"
        />
        <StatCard
          title="Clients"
          value={totalClients}
          icon={Users}
          href="/dashboard/clients"
        />
        <StatCard
          title="Departments"
          value={departments.length}
          icon={Building2}
          href="/dashboard/departments"
        />
        <StatCard
          title="Active Assets"
          value={activeAssets}
          icon={Wrench}
          href="/dashboard/equipment"
        />
        <StatCard
          title="Active Vendors"
          value={vendorsCount}
          icon={Briefcase}
          href="/dashboard/vendors"
        />
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Departments Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Departments</h2>
            <Link href="/dashboard/departments" className="text-xs font-medium text-indigo-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {departments.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No departments created yet.</p>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-indigo-50 text-indigo-600">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{dept.name}</p>
                      <p className="text-xs text-slate-500">{dept._count.users} members</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Leave Requests</h2>
            <Link href="/dashboard/employees/leaves" className="text-xs font-medium text-indigo-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No recent leave requests found.
                    </td>
                  </tr>
                ) : (
                  recentLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{leave.user?.name || "Unknown"}</td>
                      <td className="px-4 py-3">{leave.type}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : "N/A"} -{" "}
                        {leave.endDate ? new Date(leave.endDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          leave.status === "APPROVED" 
                            ? "bg-emerald-50 text-emerald-700" 
                            : leave.status === "PENDING" 
                            ? "bg-amber-50 text-amber-700" 
                            : "bg-rose-50 text-rose-750"
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Quick Links Footer Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-lg font-semibold">Need to manage Purchase Orders?</h2>
          <p className="text-xs text-slate-400">Access vendor purchase orders and procurement pipelines directly.</p>
        </div>
        <Link
          href="/dashboard/vendors/purchase-orders"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          View Purchase Orders <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, href }: { title: string; value: number; icon: any; href: string }) {
  return (
    <Link href={href} className="block bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</span>
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
    </Link>
  );
}