"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Activity,
  DollarSign,
  Target,
  Zap,
  Loader2,
  Receipt,
  Users,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Wrench,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceData {
  clientStats: {
    totalInvoiced: number;
    totalReceived: number;
    totalDue: number;
    averageProjectProfit: number;
    invoiceBreakdown: Record<string, number>;
  };
  employeeStats: {
    monthlyPayroll: number;
    totalDisbursed: number;
    averageEfficiency: number;
    topEarner: string | null;
    headCount: number;
    payoutBreakdown: Record<string, number>;
  };
  equipmentStats: {
    assetValuation: number;
    rentalOutflow: number;
    totalProductionSpend: number;
    expenseCategoryBreakdown: Record<string, number>;
  };
  overhead: {
    fixedCosts: number;
    burnRate: number;
    overheadBreakdown: Record<string, number>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const INVOICE_STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-500/15 text-emerald-500",
  SENT: "bg-blue-500/15 text-blue-500",
  PARTIALLY_PAID: "bg-amber-500/15 text-amber-500",
  OVERDUE: "bg-rose-500/15 text-rose-500 animate-pulse",
  DRAFT: "bg-slate-500/15 text-slate-400",
  VOID: "bg-slate-700/15 text-slate-500",
};

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  EQUIPMENT: "bg-blue-500",
  LOCATION: "bg-purple-500",
  TRANSPORT: "bg-amber-500",
  CATERING: "bg-emerald-500",
  TALENT: "bg-rose-500",
  RENTAL: "bg-orange-500",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinanceOverviewPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/finance/overview");
        if (!res.ok) throw new Error("Failed to load financial data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse text-muted-foreground">
          Calculating Fiscal Position...
        </p>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-rose-500 font-black uppercase text-sm tracking-widest">
          Financial Data Unavailable
        </p>
        <p className="text-[10px] text-muted-foreground">{error}</p>
      </div>
    );
  }

  // ── Derived calculations ──
  const { clientStats, employeeStats, equipmentStats, overhead } = data;

  const totalOutflow =
    employeeStats.monthlyPayroll + equipmentStats.rentalOutflow + overhead.fixedCosts;

  const netPosition = clientStats.totalReceived - totalOutflow;

  const collectionRate =
    clientStats.totalInvoiced > 0
      ? (clientStats.totalReceived / clientStats.totalInvoiced) * 100
      : 0;

  const grossMargin =
    clientStats.totalInvoiced > 0
      ? ((clientStats.totalInvoiced - totalOutflow) / clientStats.totalInvoiced) * 100
      : 0;

  // Sort invoice breakdown for the waterfall bar
  const invoiceEntries = Object.entries(clientStats.invoiceBreakdown).sort(
    ([, a], [, b]) => b - a
  );

  // Sort production expense breakdown
  const expenseEntries = Object.entries(
    equipmentStats.expenseCategoryBreakdown
  ).sort(([, a], [, b]) => b - a);
  const expenseTotal = expenseEntries.reduce((s, [, v]) => s + v, 0);

  // Payout breakdown
  const payoutEntries = Object.entries(employeeStats.payoutBreakdown).sort(
    ([, a], [, b]) => b - a
  );
  const payoutTotal = payoutEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="p-8 space-y-10 max-w-[1500px] mx-auto animate-in fade-in duration-700">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
              Fiscal Command Center
            </span>
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground">
            Financial <span className="text-blue-600">Overview</span>
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
            {employeeStats.headCount} Staff &middot; Live Revenue Intelligence
          </p>
        </div>

        {/* Net Position Badge */}
        <div className="bg-card border border-border p-4 rounded-3xl shadow-sm flex items-center gap-6">
          <div className="text-right border-r border-border pr-6">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">
              Net Position
            </p>
            <p
              className={`text-2xl font-black font-mono italic ${
                netPosition >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {netPosition >= 0 ? "+" : "-"}${fmt(Math.abs(netPosition))}
            </p>
          </div>
          <div className="text-right border-r border-border pr-6">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">
              Gross Margin
            </p>
            <p className="text-2xl font-black font-mono italic text-blue-500">
              {grossMargin.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">
              Collection Rate
            </p>
            <p className="text-2xl font-black font-mono italic text-amber-500">
              {collectionRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </header>

      {/* ── TOP STATS GRID ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <PartitionCard
          label="Total Invoiced"
          value={`$${fmt(clientStats.totalInvoiced)}`}
          sub="Gross Billed YTD"
          trend={<span className="text-emerald-500">Revenue</span>}
          icon={<Receipt size={16} />}
          color="blue"
        />
        <PartitionCard
          label="Monthly Payroll"
          value={`$${fmt(employeeStats.monthlyPayroll)}`}
          sub={`${employeeStats.headCount} Active Staff`}
          trend={<span className="text-rose-400">Outflow</span>}
          icon={<Users size={16} />}
          color="rose"
        />
        <PartitionCard
          label="Asset Valuation"
          value={`$${fmt(equipmentStats.assetValuation)}`}
          sub="Owned Equipment Book Value"
          trend={<span className="text-amber-400">Assets</span>}
          icon={<Wrench size={16} />}
          color="orange"
        />
        <PartitionCard
          label="Fixed Overhead"
          value={`$${fmt(overhead.fixedCosts)}`}
          sub={`$${fmt(overhead.burnRate)}/day burn`}
          trend={<span className="text-slate-400">Burn</span>}
          icon={<Building2 size={16} />}
          color="slate"
        />
      </div>

      {/* ── REVENUE + RECEIVABLES SECTION ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left: Revenue breakdown */}
        <section className="xl:col-span-2 bg-card rounded-[3rem] border border-border p-8 space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 italic">
              Revenue Partition
            </h2>
            <div className="h-px flex-1 bg-blue-600/20" />
          </div>

          {/* Hero number */}
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                Total Invoiced YTD
              </p>
              <p className="text-5xl font-black italic">
                ${fmt(clientStats.totalInvoiced)}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Collected
                </p>
                <p className="text-xl font-black font-mono text-emerald-500">
                  +${fmt(clientStats.totalReceived)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Outstanding
                </p>
                <p className="text-xl font-black font-mono text-amber-500">
                  ${fmt(clientStats.totalDue)}
                </p>
              </div>
            </div>
          </div>

          {/* Collection progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground tracking-widest">
              <span>Collection Progress</span>
              <span>{collectionRate.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Invoice status waterfall */}
          <div className="space-y-3 pt-4 border-t border-border">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
              Invoice Status Breakdown
            </p>
            {invoiceEntries.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">No invoices found.</p>
            ) : (
              invoiceEntries.map(([status, amount]) => {
                const pct =
                  clientStats.totalInvoiced > 0
                    ? (amount / clientStats.totalInvoiced) * 100
                    : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span
                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest min-w-[90px] text-center ${
                        INVOICE_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 opacity-70 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono font-black text-[11px] text-foreground min-w-[70px] text-right">
                      ${fmt(amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Mini stats row */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
            <MiniStat
              label="Avg Task Profit"
              value={`$${fmt(Math.round(clientStats.averageProjectProfit))}`}
            />
            <MiniStat
              label="Total Production Spend"
              value={`$${fmt(equipmentStats.totalProductionSpend)}`}
            />
            <MiniStat
              label="Daily Burn Rate"
              value={`$${fmt(Math.round(overhead.burnRate))}`}
            />
          </div>
        </section>

        {/* Right: Efficiency dark panel */}
        <section className="bg-slate-950 rounded-[3rem] p-8 text-white space-y-8 flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-6">
              Efficiency Intelligence
            </p>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">
                  Top Earner
                </p>
                <p className="text-2xl font-black italic uppercase text-emerald-400 leading-tight">
                  {employeeStats.topEarner ?? "Analyzing..."}
                </p>
                <p className="text-xs font-bold opacity-50 uppercase mt-1">
                  Highest Salary Contributor
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">
                  Avg Efficiency Rate
                </p>
                <p className="text-3xl font-black italic font-mono text-white">
                  {employeeStats.averageEfficiency.toFixed(2)}
                  <span className="text-blue-400 text-lg">x</span>
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2">
                  Total Disbursed
                </p>
                <p className="text-2xl font-black italic font-mono text-amber-400">
                  ${fmt(employeeStats.totalDisbursed)}
                </p>
                <p className="text-[9px] opacity-50 uppercase font-black tracking-widest mt-1">
                  Salaries · Bonuses · Commission
                </p>
              </div>
            </div>
          </div>

          {/* Payout breakdown mini bars */}
          {payoutEntries.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-white/10">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                Payout Categories
              </p>
              {payoutEntries.map(([cat, amount]) => {
                const pct = payoutTotal > 0 ? (amount / payoutTotal) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-white/60">{cat}</span>
                      <span className="text-white/80 font-mono">${fmt(amount)}</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── COST BREAKDOWN SECTION ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* Production Expense Breakdown */}
        <section className="bg-card rounded-[3rem] border border-border p-8 space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 italic">
              Production Spend
            </h2>
            <div className="h-px flex-1 bg-orange-500/20" />
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
              Total Task Expenses
            </p>
            <p className="text-4xl font-black italic">
              ${fmt(equipmentStats.totalProductionSpend)}
            </p>
          </div>

          <div className="space-y-4">
            {expenseEntries.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">
                No production expenses logged.
              </p>
            ) : (
              expenseEntries.map(([cat, amount]) => {
                const pct = expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0;
                const dotColor =
                  EXPENSE_CATEGORY_COLORS[cat] ?? "bg-slate-500";
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          {cat}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-muted-foreground">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="font-mono font-black text-[11px] text-foreground">
                          ${fmt(amount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dotColor} opacity-70`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rental vs owned split */}
          <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
            <div>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                External Rentals
              </p>
              <p className="text-lg font-black font-mono text-rose-500">
                ${fmt(equipmentStats.rentalOutflow)}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                Equipment Book Value
              </p>
              <p className="text-lg font-black font-mono text-emerald-500">
                ${fmt(equipmentStats.assetValuation)}
              </p>
            </div>
          </div>
        </section>

        {/* Overhead Breakdown */}
        <section className="bg-card rounded-[3rem] border border-border p-8 space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
              Overhead Analysis
            </h2>
            <div className="h-px flex-1 bg-slate-500/20" />
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
              Fixed Agency Costs
            </p>
            <p className="text-4xl font-black italic">
              ${fmt(overhead.fixedCosts)}
            </p>
          </div>

          {/* Overhead category breakdown */}
          <div className="space-y-4">
            {Object.entries(overhead.overheadBreakdown).length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">
                No overhead expenses logged.
              </p>
            ) : (
              Object.entries(overhead.overheadBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const pct =
                    overhead.fixedCosts > 0
                      ? (amount / overhead.fixedCosts) * 100
                      : 0;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          {cat}
                        </span>
                        <span className="font-mono font-black text-[11px] text-foreground">
                          ${fmt(amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-500 opacity-60 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Burn rate callout */}
          <div className="pt-4 border-t border-border bg-muted/30 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Daily Burn Rate
              </p>
              <p className="text-2xl font-black font-mono text-foreground">
                ${fmt(Math.round(overhead.burnRate))}
                <span className="text-[10px] text-muted-foreground font-bold">/day</span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-500/10">
              <Zap size={20} className="text-slate-500" />
            </div>
          </div>
        </section>
      </div>

      {/* ── FULL OUTFLOW vs INFLOW RECONCILIATION ──────────────── */}
      <section className="bg-slate-950 rounded-[3rem] p-8 text-white">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 italic">
            Cash Flow Reconciliation
          </h2>
          <div className="h-px flex-1 bg-blue-400/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Inflow */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight size={16} className="text-emerald-400" />
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                Total Inflow
              </p>
            </div>
            <p className="text-4xl font-black italic font-mono text-emerald-400">
              +${fmt(clientStats.totalReceived)}
            </p>
            <p className="text-[9px] opacity-50 uppercase font-black tracking-widest">
              Cash collected from clients
            </p>
          </div>

          {/* Outflow */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDownRight size={16} className="text-rose-400" />
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">
                Total Outflow
              </p>
            </div>
            <p className="text-4xl font-black italic font-mono text-rose-400">
              -${fmt(totalOutflow)}
            </p>
            <div className="space-y-1 pt-2">
              <LedgerLine label="Payroll" value={`$${fmt(employeeStats.monthlyPayroll)}`} />
              <LedgerLine label="Rentals" value={`$${fmt(equipmentStats.rentalOutflow)}`} />
              <LedgerLine label="Overhead" value={`$${fmt(overhead.fixedCosts)}`} />
            </div>
          </div>

          {/* Net */}
          <div className="space-y-2 border-l border-white/10 pl-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-blue-400" />
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                Net Position
              </p>
            </div>
            <p
              className={`text-4xl font-black italic font-mono ${
                netPosition >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {netPosition >= 0 ? "+" : ""}${fmt(netPosition)}
            </p>
            <p className="text-[9px] opacity-50 uppercase font-black tracking-widest">
              {netPosition >= 0 ? "Profitable Operations" : "Operating at a Loss"}
            </p>

            {/* Margin pill */}
            <div
              className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                grossMargin >= 0
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
            >
              <TrendingUp size={12} />
              {grossMargin.toFixed(1)}% Gross Margin
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function PartitionCard({ label, value, sub, trend, icon, color }: any) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    rose: "text-rose-600",
    orange: "text-orange-600",
    slate: "text-slate-500",
  };
  return (
    <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm hover:border-foreground/20 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-muted ${colorMap[color]}`}>{icon}</div>
        <span className="text-[9px] font-black uppercase tracking-widest">{trend}</span>
      </div>
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic mb-1">
          {label}
        </p>
        <p className="text-2xl font-black font-mono italic">{value}</p>
        <p className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-1 tracking-widest">
          {sub}
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-sm font-black text-foreground uppercase italic tracking-tighter">
        {value}
      </p>
    </div>
  );
}

function LedgerLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[9px] uppercase font-black text-white/40 tracking-widest">
        {label}
      </span>
      <span className="font-mono text-[11px] font-black text-white/60">{value}</span>
    </div>
  );
}
