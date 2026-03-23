"use client";

import React, { useRef } from "react";
import Link from "next/link";

export default function LandingPage() {
  // Refs for scrolling
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-blue-100">
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
          <div className="text-xl font-black tracking-tighter flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
            AGENCY.OS
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <button onClick={() => scrollTo(featuresRef)} className="hover:text-blue-600 transition-colors">Features</button>
            <button onClick={() => scrollTo(pricingRef)} className="hover:text-blue-600 transition-colors">Pricing</button>
            <Link href="/login" className="text-foreground border border-border px-4 py-2 rounded-xl hover:bg-muted transition-all">Operator Login</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-8 pt-40 pb-20 text-center space-y-8">
        <div className="inline-block px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          Now in Production v2.0
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase italic">
          Manage your <span className="text-blue-600">Production</span> <br /> like a machine.
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
          The all-in-one OS for media agencies. Track assets, manage high-stakes projects, 
          and protect your profit margins with surgical precision.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/signup">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200/20 active:scale-95 text-xs">
              Deploy Free Terminal
            </button>
          </Link>
        </div>
      </section>

      {/* STATS / TRUST */}
      <section className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-card border border-border rounded-3xl space-y-2">
            <h3 className="text-4xl font-black text-blue-600 tracking-tighter italic">98%</h3>
            <p className="font-black uppercase text-[10px] tracking-widest opacity-60">Margin Accuracy</p>
          </div>
          <div className="p-8 bg-card border border-border rounded-3xl space-y-2">
            <h3 className="text-4xl font-black text-blue-600 tracking-tighter italic">24/7</h3>
            <p className="font-black uppercase text-[10px] tracking-widest opacity-60">Asset Tracking</p>
          </div>
          <div className="p-8 bg-card border border-border rounded-3xl space-y-2">
            <h3 className="text-4xl font-black text-blue-600 tracking-tighter italic">INSTANT</h3>
            <p className="font-black uppercase text-[10px] tracking-widest opacity-60">Financial Visibility</p>
          </div>
        </div>
      </section>

      <hr className="border-border max-w-7xl mx-auto my-20" />

      {/* FEATURES SECTION */}
      <section ref={featuresRef} className="max-w-7xl mx-auto px-8 py-20 scroll-mt-24">
        <header className="mb-16 space-y-4">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Production Modules</h2>
          <div className="h-1 w-20 bg-blue-600 rounded-full" />
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <FeatureItem 
            title="HR & Multi-Tenancy" 
            desc="Manage Full-time staff and Freelancers. Track attendance logs and efficiency rates per creative operator." 
          />
          <FeatureItem 
            title="Financial Logistics" 
            desc="Auto-calculate gross revenue vs margins. Track external rentals (camera gear, lighting) directly against project budgets." 
          />
          <FeatureItem 
            title="Asset Inventory" 
            desc="Full hardware database. Assign equipment to specific tasks and monitor availability status in real-time." 
          />
          <FeatureItem 
            title="Client Portal" 
            desc="Unified billing. Manage clients, projects, and invoice statuses (Sent, Paid, Overdue) in one command center." 
          />
        </div>
      </section>

      {/* PRICING SECTION */}
      <section ref={pricingRef} className="bg-muted/30 py-32 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-8">
          <header className="text-center mb-20">
            <h2 className="text-5xl font-black tracking-tighter uppercase italic mb-4">Subscription Tiers</h2>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.3em]">Scalable Infrastructure for any team size</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard 
              plan="Free" 
              price="0" 
              features={["5 Users", "50 Projects", "Basic Task Tracking"]} 
            />
            <PricingCard 
              plan="Pro" 
              price="49" 
              highlight 
              features={["Unlimited Users", "Unlimited Projects", "Asset Management", "Financial Reports"]} 
            />
            <PricingCard 
              plan="Enterprise" 
              price="Custom" 
              features={["White-label Terminal", "Multi-Agency Support", "24/7 Technical Ops"]} 
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
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

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="group space-y-4">
      <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground font-medium leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

function PricingCard({ plan, price, features, highlight = false }: any) {
  return (
    <div className={`p-10 rounded-[2.5rem] border transition-all ${highlight ? 'bg-card border-blue-600 shadow-2xl scale-105' : 'bg-card/50 border-border'}`}>
      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-6">{plan}</h4>
      <div className="flex items-baseline gap-1 mb-8">
        {price !== "Custom" && <span className="text-4xl font-black tracking-tighter">$</span>}
        <span className="text-6xl font-black tracking-tighter">{price}</span>
        {price !== "Custom" && <span className="text-muted-foreground text-[10px] font-black uppercase ml-2">/mo</span>}
      </div>
      <ul className="space-y-4 mb-10">
        {features.map((f: string) => (
          <li key={f} className="text-sm font-bold flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" /> {f}
          </li>
        ))}
      </ul>
      <Link href="/signup">
        <button className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${highlight ? 'bg-blue-600 text-white shadow-lg' : 'bg-muted hover:bg-border'}`}>
          Initialize
        </button>
      </Link>
    </div>
  );
}