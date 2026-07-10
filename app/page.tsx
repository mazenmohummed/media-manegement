"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileStack,
  Layers3,
  LockKeyhole,
  MapPin,
  ReceiptText,
  ShieldCheck,
  UsersRound,
  WalletCards,
  Webhook,
} from "lucide-react";

type SectionRef = React.RefObject<HTMLDivElement | null>;

const plans = [
  {
    name: "FREE",
    price: "$0",
    href: "/deploy/agency?plan=FREE",
    description: "Start managing clients, projects, and tasks with clean agency structure.",
    limits: ["5 users", "50 projects", "Basic finance tracking"],
  },
  {
    name: "PRO",
    price: "$49",
    href: "/deploy/agency?plan=PRO",
    description: "For growing teams that need field operations, reporting, and approvals.",
    limits: ["20 users", "200 projects", "Geofencing and advanced reports"],
    featured: true,
  },
  {
    name: "UNLIMITED",
    price: "Custom",
    href: "/deploy/agency?plan=UNLIMITED",
    description: "For multi-team agencies with custom workflows and integration needs.",
    limits: ["Unlimited users", "Unlimited projects", "API access and priority support"],
  },
];

const modules = [
  {
    icon: UsersRound,
    title: "Clients & Statements",
    text: "Manage client records, contacts, budgets, invoices, payments, allocations, credit notes, and issued statements.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Projects & Campaigns",
    text: "Connect campaigns, contracts, creative briefs, deliverables, feedback, cloud links, and recurring work.",
  },
  {
    icon: ClipboardCheck,
    title: "Tasks & Production",
    text: "Plan assignments, dependencies, sessions, todos, attendance, approvals, assets, and field check-ins.",
  },
  {
    icon: CircleDollarSign,
    title: "Expenses & Profit",
    text: "Track planned costs, actual expenses, vendor spend, reimbursements, task margins, and project profitability.",
  },
  {
    icon: BarChart3,
    title: "Reporting Periods",
    text: "Close monthly periods, monitor aging, revenue, collection, budget usage, utilization, and operating cost.",
  },
  {
    icon: Webhook,
    title: "SaaS Infrastructure",
    text: "Use subscriptions, feature gates, audit logs, invitations, API keys, webhooks, email logs, and role-based access.",
  },
];

const workflow = [
  "Onboard agency and subscription",
  "Invite users and assign roles",
  "Create clients, budgets, and contacts",
  "Open campaigns, contracts, and projects",
  "Plan tasks, resources, and expenses",
  "Invoice, allocate payments, issue statements",
  "Close reporting periods with audit history",
];

export default function LandingPage() {
  const { data: session } = useSession();
  const productRef = useRef<HTMLDivElement>(null);
  const financeRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const dashboardHref = session?.user?.agencyId ? "/dashboard" : session ? "/deploy/agency" : "/login";

  const scrollTo = (ref: SectionRef) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#172033]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-[#101828]/82 text-white backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs font-black text-[#172033]">
              AMS
            </span>
            <span className="text-sm font-black ">Agency Manegment System</span>
          </button>

          <div className="hidden items-center gap-7 text-xs font-semibold text-white/75 md:flex">
            <button type="button" onClick={() => scrollTo(productRef)} className="transition hover:text-white">
              Product
            </button>
            <button type="button" onClick={() => scrollTo(financeRef)} className="transition hover:text-white">
              Reporting
            </button>
            <button type="button" onClick={() => scrollTo(pricingRef)} className="transition hover:text-white">
              Pricing
            </button>
          </div>

          <Link
            href={dashboardHref}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-[#172033] transition hover:bg-[#e9edf5]"
          >
            {session?.user?.agencyId ? "Open dashboard" : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      <section
        className="relative min-h-[760px] overflow-hidden bg-cover bg-center text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(16,24,40,0.94), rgba(16,24,40,0.72), rgba(16,24,40,0.2)), url('https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=2200&q=80')",
        }}
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-32 md:grid-cols-[0.95fr_1.05fr] md:px-8 md:pt-40">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/82">
              <ShieldCheck className="h-4 w-4" />
              Multi-tenant SaaS for agencies
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              AgencyOS
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/78">
              A professional operating system for agencies that need clients, projects, tasks, planned expenses,
              invoices, payment allocation, statements, assets, HR, and reporting in one controlled workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/deploy/agency?plan=FREE"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#2f6fed] px-5 text-sm font-bold text-white transition hover:bg-[#245fd2]"
              >
                Deploy free workspace
                <ChevronRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => scrollTo(productRef)}
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/25 px-5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                View product
              </button>
            </div>
          </div>

          <div className="self-end">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className=" border-y border-[#d8deea] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-[#d8deea] px-0 md:grid-cols-4">
          <Stat value="14+" label="Core schema domains" />
          <Stat value="360°" label="Client financial view" />
          <Stat value="Real time" label="Task and field operations" />
          <Stat value="Audit-ready" label="Approvals and logs" />
        </div>
      </section>

      <section ref={productRef} className="scroll-mt-24 bg-[#f7f8fb] py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2f6fed]">Product Modules</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Built around the real agency workflow, not a generic CRM.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <article key={module.title} className="rounded-md border border-[#d8deea] bg-white p-6 shadow-sm">
                <module.icon className="mb-5 h-6 w-6 text-[#2f6fed]" />
                <h3 className="text-lg font-bold">{module.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5e6a7f]">{module.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section ref={financeRef} className="scroll-mt-24 bg-white py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2f6fed]">Client Statements</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Finance that can explain itself.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#5e6a7f]">
              The schema supports invoices, invoice items, payments, payment allocations, credit notes, reporting
              periods, client statements, and statement lines. That means your team can show clients exactly what was
              billed, paid, credited, overdue, and still open.
            </p>

            <div className="mt-8 grid gap-3">
              <FinancePoint icon={ReceiptText} text="Invoice balances and aging by client, project, and period" />
              <FinancePoint icon={WalletCards} text="Partial payment allocation across multiple invoices" />
              <FinancePoint icon={FileStack} text="Statement PDFs backed by immutable statement lines" />
              <FinancePoint icon={LockKeyhole} text="Audit logs, approvals, and role-controlled finance access" />
            </div>
          </div>

          <StatementPreview />
        </div>
      </section>

      <section className="bg-[#172033] py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_0.9fr] md:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#86efac]">Operations Flow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              From first client call to closed reporting period.
            </h2>
          </div>

          <div className="grid gap-3">
            {workflow.map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-md border border-white/12 bg-white/7 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-black text-[#172033]">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-white/86">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={pricingRef} className="scroll-mt-24 bg-[#f7f8fb] py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#2f6fed]">Plans</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Start light. Add operational depth as you grow.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#5e6a7f]">
              The landing page maps directly to your schema: `SubscriptionPlan`, feature gates, user limits, project
              limits, asset access, geofencing, reporting, and API workflows.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-md border p-6 shadow-sm ${
                  plan.featured ? "border-[#2f6fed] bg-white" : "border-[#d8deea] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black tracking-[0.18em] text-[#2f6fed]">{plan.name}</h3>
                    <p className="mt-4 text-4xl font-black tracking-tight">{plan.price}</p>
                  </div>
                  {plan.featured && (
                    <span className="rounded-md bg-[#eaf1ff] px-3 py-1 text-xs font-bold text-[#2f6fed]">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-5 min-h-14 text-sm leading-6 text-[#5e6a7f]">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.limits.map((limit) => (
                    <li key={limit} className="flex items-center gap-2 text-sm font-semibold">
                      <Check className="h-4 w-4 text-[#16a34a]" />
                      {limit}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-bold transition ${
                    plan.featured
                      ? "bg-[#2f6fed] text-white hover:bg-[#245fd2]"
                      : "border border-[#d8deea] text-[#172033] hover:bg-[#edf1f7]"
                  }`}
                >
                  Choose {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d8deea] bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 text-sm text-[#5e6a7f] md:flex-row md:items-center md:justify-between md:px-8">
          <div className="font-black tracking-[0.18em] text-[#172033]">AGENCYOS</div>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="hover:text-[#172033]">
              Login
            </Link>
            <Link href="/deploy/agency?plan=FREE" className="hover:text-[#172033]">
              Create workspace
            </Link>
            <Link href="/dashboard" className="hover:text-[#172033]">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-md border border-white/18 bg-[#f7f8fb] p-3 text-[#172033] shadow-2xl">
      <div className="grid gap-3 rounded-md border border-[#d8deea] bg-white p-4">
        <div className="flex items-center justify-between border-b border-[#e5e9f1] pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e6a7f]">Agency dashboard</p>
            <p className="mt-1 text-xl font-black">Friday operations</p>
          </div>
          <span className="rounded-md bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">Live</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <PreviewMetric label="Open tasks" value="128" />
          <PreviewMetric label="Outstanding" value="EGP 284k" />
          <PreviewMetric label="Utilization" value="82%" />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-md border border-[#e5e9f1] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">Production timeline</p>
              <Layers3 className="h-4 w-4 text-[#2f6fed]" />
            </div>
            {["Creative brief", "Shoot logistics", "Client review", "Statement issued"].map((item, index) => (
              <div key={item} className="mb-3 flex items-center gap-3 last:mb-0">
                <span className="h-2 w-2 rounded-full bg-[#2f6fed]" />
                <span className="flex-1 text-sm font-medium">{item}</span>
                <span className="text-xs text-[#5e6a7f]">{index < 2 ? "Active" : "Queued"}</span>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-[#e5e9f1] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">Field task</p>
              <MapPin className="h-4 w-4 text-[#2f6fed]" />
            </div>
            <p className="text-2xl font-black">Gouna launch</p>
            <p className="mt-2 text-sm text-[#5e6a7f]">4 operators checked in within geofence.</p>
            <div className="mt-5 h-2 rounded-md bg-[#e5e9f1]">
              <div className="h-2 w-[72%] rounded-md bg-[#2f6fed]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatementPreview() {
  const rows = [
    ["Opening balance", "EGP 12,000", ""],
    ["INV-1042 Campaign production", "EGP 86,000", ""],
    ["PAY-887 Bank transfer", "", "EGP 40,000"],
    ["Credit note CN-014", "", "EGP 3,500"],
    ["Closing balance", "EGP 54,500", ""],
  ];

  return (
    <div className="rounded-md border border-[#d8deea] bg-[#f7f8fb] p-4 shadow-sm">
      <div className="rounded-md bg-white p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e9f1] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f6fed]">Client Statement</p>
            <h3 className="mt-2 text-2xl font-black">ST-2026-07</h3>
          </div>
          <span className="rounded-md bg-[#fff7ed] px-3 py-1 text-xs font-bold text-[#c2410c]">Due in 9 days</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PreviewMetric label="Invoiced" value="EGP 86k" />
          <PreviewMetric label="Paid" value="EGP 43.5k" />
          <PreviewMetric label="Balance" value="EGP 54.5k" />
        </div>

        <div className="mt-5 overflow-hidden rounded-md border border-[#e5e9f1]">
          {rows.map(([label, debit, credit]) => (
            <div key={label} className="grid grid-cols-[1fr_110px_110px] gap-2 border-b border-[#e5e9f1] px-3 py-3 text-sm last:border-b-0">
              <span className="font-medium">{label}</span>
              <span className="text-right font-mono text-[#b45309]">{debit}</span>
              <span className="text-right font-mono text-[#15803d]">{credit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white px-5 py-7">
      <p className="text-2xl font-black tracking-tight text-[#172033]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#5e6a7f]">{label}</p>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e5e9f1] bg-[#f7f8fb] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5e6a7f]">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function FinancePoint({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-[#d8deea] bg-[#f7f8fb] p-4">
      <Icon className="mt-0.5 h-5 w-5 text-[#2f6fed]" />
      <p className="text-sm font-semibold leading-6 text-[#172033]">{text}</p>
    </div>
  );
}
