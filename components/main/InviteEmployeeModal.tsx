"use client";

import React, { useState } from "react";

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const AVAILABLE_ROLES = [
  { value: "ADMIN", label: "Admin - Full management access" },
  { value: "TEAMLEADER", label: "Team Leader - Oversees projects & creatives" },
  { value: "CREATIVE", label: "Creative - Production & task execution" },
  { value: "OPERATOR", label: "Operator - Day-to-day operations" },
  { value: "FINANCE", label: "Finance - Invoices, expenses & budgets" },
];

export default function InviteEmployeeModal({
  isOpen,
  onClose,
  onRefresh,
}: InviteEmployeeModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CREATIVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      const res = await fetch("/api/agency/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to issue invitation.");
      }

      setGeneratedUrl(data.inviteUrl);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetAndClose = () => {
    setEmail("");
    setRole("CREATIVE");
    setError(null);
    setGeneratedUrl(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl space-y-6">
        <div className="flex justify-between items-start border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground italic">
              Invite Team Member
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-medium">
              Grant workforce access to agency workspace
            </p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-muted-foreground hover:text-foreground text-xl font-mono"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-wider p-4 rounded-2xl">
            {error}
          </div>
        )}

        {generatedUrl ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider p-4 rounded-2xl">
              ✓ Invitation Issued Successfully!
            </div>

            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Direct Access Invitation Link:
            </p>

            <div className="flex items-center gap-2 bg-muted p-2 rounded-xl border border-border">
              <input
                type="text"
                readOnly
                value={generatedUrl}
                className="bg-transparent text-xs font-mono text-foreground w-full px-2 outline-none"
              />
              <button
                onClick={handleCopy}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full bg-foreground text-background py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[0.98] transition-all mt-4"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground block">
                Employee Email Address
              </label>
              <input
                type="email"
                required
                placeholder="colleague@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-xs font-medium text-foreground focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground block">
                Assign System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-xs font-medium text-foreground focus:outline-none focus:border-blue-500 transition-all"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {loading ? "Issuing Link..." : "Send Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}