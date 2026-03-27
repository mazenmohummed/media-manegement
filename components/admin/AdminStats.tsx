import React from "react";
import { Users, Layout, CreditCard, Zap, TrendingUp } from "lucide-react";

interface AdminStatsProps {
  data: {
    totalAgencies: number;
    totalRevenue: number;
    mrr: number;
    totalUsers: number;
    activeTrials: number;
  };
}

export default function AdminStats({ data }: AdminStatsProps) {
  const stats = [
    {
      title: "Active Agencies",
      value: data.totalAgencies,
      icon: <Layout className="text-blue-600" size={20} />,
      label: "Live Deployments",
    },
    {
      title: "Monthly Revenue",
      value: `$${data.mrr.toLocaleString()}`,
      icon: <TrendingUp className="text-emerald-500" size={20} />,
      label: "Current Month MRR",
      highlight: true,
    },
    {
      title: "Lifetime Revenue",
      value: `$${data.totalRevenue.toLocaleString()}`,
      icon: <CreditCard className="text-purple-500" size={20} />,
      label: "Global Gross Volume",
    },
    {
      title: "Total Operators",
      value: data.totalUsers,
      icon: <Users className="text-amber-500" size={20} />,
      label: "System-wide Accounts",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div 
          key={stat.title}
          className={`p-6 rounded-[2rem] border transition-all ${
            stat.highlight 
              ? "bg-card border-blue-600/50 shadow-xl shadow-blue-500/5" 
              : "bg-card/50 border-border hover:border-muted-foreground/20"
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-muted rounded-2xl">
              {stat.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
              Hurghada_Node_v3
            </span>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-4xl font-black tracking-tighter italic">
              {stat.value}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {stat.title}
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-[9px] font-bold uppercase tracking-tight opacity-60">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}