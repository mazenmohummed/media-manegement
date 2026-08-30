// app/dashboard/employees/leaves/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  reason: string | null;
  approvedBy: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    userType: string;
    department: {
      id: string;
      name: string;
    } | null;
  };
  approval: {
    id: string;
    status: string;
    notes: string | null;
    decidedAt: string | null;
    requester: {
      id: string;
      name: string;
      email: string;
    } | null;
    decider: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
}

export default function EmployeeLeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const url = `/api/users/leaves${filterStatus !== "ALL" ? `?status=${filterStatus}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setLeaves(data.leaves);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [filterStatus]);

  const handleApprove = async (leaveId: string) => {
    if (!confirm("Are you sure you want to approve this leave request?")) return;
    
    setActionLoading(leaveId);
    try {
      const res = await fetch(`/api/users/leaves/${leaveId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });

      if (res.ok) {
        await fetchLeaves();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to approve leave");
      }
    } catch (error) {
      console.error("Error approving leave:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (leaveId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason === null) return;

    setActionLoading(leaveId);
    try {
      const res = await fetch(`/api/users/leaves/${leaveId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", notes: reason }),
      });

      if (res.ok) {
        await fetchLeaves();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to reject leave");
      }
    } catch (error) {
      console.error("Error rejecting leave:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRow = (leaveId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(leaveId)) {
      newExpanded.delete(leaveId);
    } else {
      newExpanded.add(leaveId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      leave.user.name.toLowerCase().includes(searchLower) ||
      leave.user.email.toLowerCase().includes(searchLower) ||
      leave.type.toLowerCase().includes(searchLower) ||
      (leave.user.department?.name || "").toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
            <XCircle className="w-3 h-3 inline mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Clock className="w-3 h-3 inline mr-1" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            Employee Leaves
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all employee leave requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/employees")}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
          >
            View All Employees
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Requests</p>
          <p className="text-2xl font-black">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-500">Pending</p>
          <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Approved</p>
          <p className="text-2xl font-black text-emerald-500">{stats.approved}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-red-500">Rejected</p>
          <p className="text-2xl font-black text-red-500">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by employee name, email, or leave type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filterStatus === status
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "ALL" ? "All" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Leaves Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Employee</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Department</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Leave Type</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Period</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <React.Fragment key={leave.id}>
                    <tr className="hover:bg-muted/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-black">
                            {leave.user.avatarUrl ? (
                              <img
                                src={leave.user.avatarUrl}
                                alt={leave.user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              leave.user.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{leave.user.name}</p>
                            <p className="text-xs text-muted-foreground">{leave.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {leave.user.department?.name || "No Department"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600">
                          {leave.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {new Date(leave.startDate).toLocaleDateString("en-GB")}
                          <span className="text-muted-foreground mx-1">→</span>
                          {new Date(leave.endDate).toLocaleDateString("en-GB")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.ceil(
                            (new Date(leave.endDate).getTime() -
                              new Date(leave.startDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          ) + 1}{" "}
                          days
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(leave.status)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {leave.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApprove(leave.id)}
                                disabled={actionLoading === leave.id}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-lg text-emerald-600 transition-colors"
                                title="Approve"
                              >
                                {actionLoading === leave.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(leave.id)}
                                disabled={actionLoading === leave.id}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg text-red-600 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => toggleRow(leave.id)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          >
                            {expandedRows.has(leave.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Row */}
                    {expandedRows.has(leave.id) && (
                      <tr>
                        <td colSpan={6} className="p-4 bg-muted/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                                Leave Details
                              </h4>
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="text-muted-foreground">Reason:</span>{" "}
                                  {leave.reason || "No reason provided"}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Requested:</span>{" "}
                                  {new Date(leave.createdAt).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                            {leave.approval && (
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                                  Approval Details
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <p>
                                    <span className="text-muted-foreground">Status:</span>{" "}
                                    {leave.approval.status}
                                  </p>
                                  {leave.approval.decider && (
                                    <p>
                                      <span className="text-muted-foreground">Reviewed by:</span>{" "}
                                      {leave.approval.decider.name}
                                    </p>
                                  )}
                                  {leave.approval.decidedAt && (
                                    <p>
                                      <span className="text-muted-foreground">Reviewed at:</span>{" "}
                                      {new Date(leave.approval.decidedAt).toLocaleDateString(
                                        "en-GB",
                                        {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }
                                      )}
                                    </p>
                                  )}
                                  {leave.approval.notes && (
                                    <p>
                                      <span className="text-muted-foreground">Notes:</span>{" "}
                                      {leave.approval.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}