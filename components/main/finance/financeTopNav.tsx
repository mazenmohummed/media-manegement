"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Camera, 
  Receipt, 
  TrendingUp,
  Zap
} from "lucide-react";

const navItems = [
  { name: "Overview", href: "/dashboard/finance", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/finance/clients", icon: Briefcase },
  { name: "Employees", href: "/dashboard/finance/employees", icon: Users },
  { name: "Equipment", href: "/dashboard/finance/equipment", icon: Camera },
  { name: "Overhead", href: "/dashboard/finance/expenses", icon: Receipt },
];

export default function FinanceTopNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-border bg-background/80 backdrop-blur-xl px-8 py-2">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
        


        {/* INLINE LINKS */}
        <div className="flex-1 flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? "bg-foreground text-background shadow-lg scale-105" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon size={16} strokeWidth={isActive ? 3 : 2} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* REAL-TIME PROFIT INDICATOR (Right-aligned) */}
        <div className="hidden xl:flex items-center gap-6 pl-8 border-l border-border">
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-0.5 italic">
              Margin Health
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black italic text-emerald-500 font-mono tracking-tighter">
                +34.2%
              </span>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
          </div>
          
          <div className="flex flex-col gap-1 w-24">
             <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[72%]" />
             </div>
             <p className="text-[7px] font-black text-muted-foreground uppercase text-center tracking-widest">Optimal</p>
          </div>
        </div>
      </div>
    </nav>
  );
}