"use client";

import React, { useState } from "react";
import { X, Loader2, UserPlus, Plus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────
interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void; // called after a successful create, so parent can refetch
}

const ROLE_OPTIONS = [
  { value: "CREATIVE", label: "Creative" },
  { value: "OPERATOR", label: "Operator" },
  { value: "TEAMLEADER", label: "Team Leader" },
  { value: "FINANCE", label: "Finance" },
  { value: "ADMIN", label: "Admin" },
];

const USER_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "FREELANCER", label: "Freelancer" },
  { value: "INTERN", label: "Intern" },
];

export default function AddEmployeeModal({ open, onClose, onCreated }: AddEmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CREATIVE");
  const [userType, setUserType] = useState("FULL_TIME");
  const [baseSalary, setBaseSalary] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [verifiedSkills, setVerifiedSkills] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("CREATIVE");
    setUserType("FULL_TIME");
    setBaseSalary("");
    setSkillInput("");
    setVerifiedSkills([]);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!verifiedSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setVerifiedSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setVerifiedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          userType,
          baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
          verifiedSkills,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Failed to create employee.");
        return;
      }

      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create employee:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-card border border-border rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary text-background flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5">
                Human Resources
              </p>
              <h2 className="text-xl font-black uppercase italic tracking-tight leading-none">
                New Employee
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={submitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5 block">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Ahmed"
              className="w-full bg-muted/40 border border-border px-4 py-3 rounded-xl text-[12px] font-bold focus:outline-none focus:border-primary/50"
              disabled={submitting}
            />
          </div>

          {/* Email + Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@agency.com"
                className="w-full bg-muted/40 border border-border px-4 py-3 rounded-xl text-[12px] font-bold focus:outline-none focus:border-primary/50"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5 block">
                Temp Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-muted/40 border border-border px-4 py-3 rounded-xl text-[12px] font-bold focus:outline-none focus:border-primary/50"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Role + Contract Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5 block">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-muted/40 border border-border px-3 py-3 rounded-xl text-[11px] font-bold focus:outline-none"
                disabled={submitting}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5 block">
                Contract Type
              </label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full bg-muted/40 border border-border px-3 py-3 rounded-xl text-[11px] font-bold focus:outline-none"
                disabled={submitting}
              >
                {USER_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Base Salary */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5 block">
              {userType === "FREELANCER" ? "Base Salary (optional for freelancers)" : "Monthly Base Salary"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black opacity-40">
                $
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="0.00"
                className="w-full bg-muted/40 border border-border pl-8 pr-4 py-3 rounded-xl text-[12px] font-bold font-mono focus:outline-none focus:border-primary/50"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Verified Skills */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1.5 block">
              Verified Skills
            </label>
            <div className="flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g. Video Editing"
                className="flex-1 bg-muted/40 border border-border px-4 py-3 rounded-xl text-[12px] font-bold focus:outline-none focus:border-primary/50"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={addSkill}
                disabled={submitting || !skillInput.trim()}
                className="px-4 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors disabled:opacity-30"
              >
                <Plus size={16} />
              </button>
            </div>
            {verifiedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {verifiedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1.5 text-[8px] font-black uppercase px-2.5 py-1 border border-border rounded-md opacity-70"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-rose-500 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-[11px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl bg-primary text-background hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus size={13} />
                  Add Employee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}