"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import InviteEmployeeModal from "@/components/main/InviteEmployeeModal";

// Aligned directly with Prisma Schema enum UserRole
export enum UserRole {
  SUPERADMIN = "SUPERADMIN",
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  TEAMLEADER = "TEAMLEADER",
  CREATIVE = "CREATIVE",
  FINANCE = "FINANCE",
  CLIENT = "CLIENT",
}

interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  agencyId: string;
  sentBy?: {
    name: string;
    email: string;
  } | null;
}

function StatCard({
  title,
  value,
  label,
  color = "text-foreground",
}: {
  title: string;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
      <p className="text-[9px] font-black text-muted-foreground uppercase mb-2 tracking-[0.2em]">
        {title}
      </p>
      <p className={`text-3xl font-black font-mono tracking-tighter ${color}`}>
        {value}
      </p>
      <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 opacity-40">
        {label}
      </p>
    </div>
  );
}

export default function AgencyInvitationsPage() {
  const { data: session, status } = useSession();
  const agencyId = session?.user?.agencyId || "";
  const userRole = (session?.user?.role as UserRole) || UserRole.CREATIVE;

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "EXPIRED">("ALL");

  // Check management privileges based on UserRole
  const canManageInvitations = useMemo(() => {
    return [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR].includes(userRole);
  }, [userRole]);

  const refreshInvitations = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetch("/api/agency/invitations");
      if (!res.ok) throw new Error("Failed fetching records");
      const data = await res.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error("Failed to load invitations:", err);
    }
  }, [agencyId]);

  useEffect(() => {
    if (status === "authenticated" && agencyId) {
      refreshInvitations().finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, agencyId, refreshInvitations]);

  const handleRevoke = async (id: string) => {
    if (!canManageInvitations) {
      alert("Insufficient administrative permissions to revoke invitations.");
      return;
    }

    if (!confirm("Are you sure you want to revoke this access invitation?")) return;
    try {
      const res = await fetch(`/api/agency/invitations?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await refreshInvitations();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to revoke invitation.");
      }
    } catch (err) {
      console.error("Failed to delete invitation:", err);
    }
  };

  const filteredInvitations = useMemo(() => {
    const now = new Date();
    return invitations.filter((inv) => {
      const isAccepted = !!inv.acceptedAt;
      const isExpired = !isAccepted && new Date(inv.expiresAt) < now;

      if (activeFilter === "PENDING") return !isAccepted && !isExpired;
      if (activeFilter === "ACCEPTED") return isAccepted;
      if (activeFilter === "EXPIRED") return isExpired;
      return true;
    });
  }, [invitations, activeFilter]);

  const metrics = useMemo(() => {
    const now = new Date();
    let pending = 0;
    let accepted = 0;
    let expired = 0;

    invitations.forEach((inv) => {
      if (inv.acceptedAt) {
        accepted++;
      } else if (new Date(inv.expiresAt) < now) {
        expired++;
      } else {
        pending++;
      }
    });

    return { total: invitations.length, pending, accepted, expired };
  }, [invitations]);

  if (status === "loading" || loading) {
    return (
      <div className="p-8 font-black uppercase animate-pulse text-xs tracking-widest text-muted-foreground">
        Synchronizing Workstage Identity & Invitations...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen space-y-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase italic">
            Employee Invitations
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.3em] mt-1">
            Workforce Onboarding & Identity Authorization
          </p>
        </div>

        {/* FILTER TAB BAR */}
        <div className="flex bg-muted p-1 rounded-xl border border-border overflow-x-auto">
          {(["ALL", "PENDING", "ACCEPTED", "EXPIRED"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                activeFilter === filter
                  ? "bg-background text-blue-600 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* METRICS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Invitations"
          value={metrics.total}
          label="Issued Records"
        />
        <StatCard
          title="Pending Invites"
          value={metrics.pending}
          label="Awaiting Response"
          color="text-blue-600"
        />
        <StatCard
          title="Accepted Onboarded"
          value={metrics.accepted}
          label="Active Employees"
          color="text-emerald-500"
        />
        <StatCard
          title="Expired Links"
          value={metrics.expired}
          label="Requires Re-issue"
          color="text-rose-500"
        />
      </div>

      {/* TABLE SECTION */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
          <h3 className="font-black text-foreground text-[10px] uppercase tracking-[0.2em]">
            Invitation Access Registry
          </h3>
          {canManageInvitations && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-foreground text-background px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[0.98] transition-all"
            >
              + Invite Employee
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase text-muted-foreground border-b border-border bg-muted/5">
              <tr>
                <th className="p-6 font-black">Recipient</th>
                <th className="p-6 font-black">Role Granted</th>
                <th className="p-6 font-black">Status</th>
                <th className="p-6 font-black">Sent Date</th>
                <th className="p-6 text-right font-black">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-xs text-muted-foreground font-black uppercase tracking-widest italic"
                  >
                    No employee invitations match the active selection.
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((item) => {
                  const isAccepted = !!item.acceptedAt;
                  const isExpired =
                    !isAccepted && new Date(item.expiresAt) < new Date();

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/5 transition-colors group"
                    >
                      <td className="p-6">
                        <p className="font-black text-foreground text-sm uppercase">
                          {item.email}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-mono uppercase mt-0.5">
                          Invited By: {item.sentBy?.name || "System Admin"}
                        </p>
                      </td>
                      <td className="p-6">
                        <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                          {item.role}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isAccepted
                                ? "bg-emerald-500"
                                : isExpired
                                ? "bg-rose-500"
                                : "bg-blue-500 animate-pulse"
                            }`}
                          />
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                            {isAccepted
                              ? "ACCEPTED"
                              : isExpired
                              ? "EXPIRED"
                              : "PENDING"}
                          </p>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="font-mono text-xs font-black text-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-mono uppercase">
                          Expires:{" "}
                          {new Date(item.expiresAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="p-6 text-right">
                        {!isAccepted && canManageInvitations && (
                          <button
                            onClick={() => handleRevoke(item.id)}
                            className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:underline"
                          >
                            Revoke Access
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <InviteEmployeeModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onRefresh={refreshInvitations}
      />
    </div>
  );
}