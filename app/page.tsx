"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { data: session } = useSession();
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) ref.current.scrollIntoView({ behavior: "smooth" });
  };

  const getStartedHref = session?.user?.agencyId 
    ? "/dashboard" 
    : session 
      ? "/deploy/agency" 
      : "/login";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-blue-100 font-sans">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
          <div 
            className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" 
            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center text-white text-[10px]">OS</div>
            AGENCY.OS
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <button onClick={() => scrollTo(featuresRef)} className="hover:text-blue-600 transition-colors cursor-pointer">Modules</button>
            <button onClick={() => scrollTo(pricingRef)} className="hover:text-blue-600 transition-colors cursor-pointer">Infrastructure</button>
            <Link href={getStartedHref} className="text-foreground border border-border px-4 py-2 rounded-xl hover:bg-muted transition-all">
              {session?.user?.agencyId ? "Open Terminal" : "Operator Login"}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-8 pt-48 pb-20 text-center space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4"
        >
          System Active: Hurghada Deployment v3.0
        </motion.div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase italic">
          Manage your <span className="text-blue-600">Agency</span> <br /> like an OS.
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
          Unified command center for media production. Track financial logistics, 
          asset deployment, and creative efficiency with precision-grade tools.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          {/* Default Hero Button to FREE plan */}
          <Link href="/deploy/agency?plan=FREE">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200/20 active:scale-95 text-xs">
              Deploy Free Terminal
            </button>
          </Link>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <StatBox value="98%" label="Margin Accuracy" />
          <StatBox value="REAL-TIME" label="Asset Tracking" />
          <StatBox value="ENCRYPTED" label="Financial Data" />
        </div>
      </section>

      <hr className="border-border max-w-7xl mx-auto my-20" />

      {/* MODULES SECTION */}
      <section ref={featuresRef} id="modules" className="max-w-7xl mx-auto px-8 py-20 scroll-mt-24">
        <header className="mb-16 space-y-4">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">
            Agency <span className="text-blue-600">Modules</span>
          </h2>
          <div className="h-1 w-20 bg-blue-600 rounded-full" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <FeatureItem title="HR & Logistics" desc="Manage full-time staff and freelancers. Track attendance logs and creative efficiency rates per operator." />
          <FeatureItem title="Financial Terminal" desc="Auto-calculate gross revenue vs margins. Track external rentals and gear fees directly against project budgets." />
          <FeatureItem title="Asset Inventory" desc="Full hardware database. Assign high-value equipment to specific tasks and monitor availability in real-time." />
          <FeatureItem title="Project Portal" desc="Unified billing and status tracking. Manage clients, project stories, and invoice statuses in one command center." />
        </div>
      </section>

      {/* PRICING SECTION - UPDATED WITH QUERY PARAMS */}
      <section ref={pricingRef} className="bg-muted/30 py-32 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <header className="mb-20">
            <h2 className="text-5xl font-black tracking-tighter uppercase italic mb-4">Infrastructure Tiers</h2>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.3em]">Scalable power for any production size</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard 
              plan="FREE" 
              price="0" 
              limits={{ employees: "5 Employees", projects: "50 Projects" }}
              features={["Basic Tracking", "Standard Support", "Mobile Access"]} 
              targetHref="/deploy/agency?plan=FREE" 
            />
            <PricingCard 
              plan="PRO" 
              price="49" 
              highlight 
              limits={{ employees: "20 Employees", projects: "200 Projects" }}
              features={["Geofencing", "Advanced HR", "Asset Database", "Financial Analysis"]} 
              targetHref="/deploy/agency?plan=PRO"
            />
            <PricingCard 
              plan="UNLIMITED" 
              price="Custom" 
              limits={{ employees: "Unlimited", projects: "Unlimited" }}
              features={["Priority Support", "API Access", "Custom Workflows", "Multi-Agency Support"]} 
              targetHref="/deploy/agency?plan=UNLIMITED"
            />
          </div>
        </div>
      </section>

      <footer className="py-20 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-black tracking-tighter">AGENCY.OS</div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            © 2026 Designed for High-Performance Media Agencies.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-8 bg-card border border-border rounded-3xl">
      <h3 className="text-4xl font-black text-blue-600 tracking-tighter italic">{value}</h3>
      <p className="font-black uppercase text-[10px] tracking-widest opacity-60 mt-2">{label}</p>
    </div>
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="group space-y-4 text-left">
      <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-muted-foreground font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingCard({ plan, price, features, limits, targetHref, highlight = false }: any) {
  return (
    <div className={`p-10 rounded-[2.5rem] border transition-all text-left flex flex-col ${highlight ? 'bg-card border-blue-600 shadow-2xl scale-105 relative z-10' : 'bg-card/50 border-border'}`}>
      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-6">{plan}</h4>
      <div className="flex items-baseline gap-1 mb-4">
        {price !== "Custom" && <span className="text-4xl font-black tracking-tighter">$</span>}
        <span className="text-6xl font-black tracking-tighter">{price}</span>
        {price !== "Custom" && <span className="text-muted-foreground text-[10px] font-black uppercase ml-2">/mo</span>}
      </div>
      <div className="flex flex-col gap-1 mb-8 pb-8 border-b border-border/50">
        <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{limits.employees} Limit</span>
        <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{limits.projects} Limit</span>
      </div>
      <ul className="space-y-4 mb-10 flex-1">
        {features.map((f: string) => (
          <li key={f} className="text-sm font-bold flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" /> {f}
          </li>
        ))}
      </ul>
      <Link href={targetHref}>
        <button className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${highlight ? 'bg-blue-600 text-white shadow-lg' : 'bg-muted hover:bg-border'}`}>
          Initialize {plan}
        </button>
      </Link>
    </div>
  );
}