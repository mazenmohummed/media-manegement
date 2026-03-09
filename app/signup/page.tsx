"use client";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      {/* Structural Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-violet-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="bg-card p-10 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-border relative z-10">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
             <div className="h-1 w-12 bg-blue-600 rounded-full" />
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">New Deployment</span>
          </div>
          <h2 className="text-4xl font-black text-foreground mb-3 tracking-tight uppercase">
            Start Your Agency Space
          </h2>
          <p className="text-muted-foreground font-medium max-w-md">
            Deploy the all-in-one neural system for high-performance media project management.
          </p>
        </header>
        
        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Agency Identification
            </label>
            <input 
              type="text" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground placeholder:text-muted-foreground/40" 
              placeholder="e.g. Creative Flow Media" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Operator Name
            </label>
            <input 
              type="text" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground" 
              placeholder="John Wick"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Secure Work Email
            </label>
            <input 
              type="email" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground" 
              placeholder="ops@agency.com"
            />
          </div>

          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Encryption Password
            </label>
            <input 
              type="password" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground" 
              placeholder="••••••••••••••••"
            />
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-2 ml-1">
              System Requirement: Minimum 12 characters with alphanumeric variety.
            </p>
          </div>

          <button className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl shadow-blue-500/20 mt-4">
            Initialize Agency Account
          </button>
        </form>
        
        <footer className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Existing Operator?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 transition-colors">
              Access Terminal
            </Link>
          </p>
          <div className="flex gap-4 opacity-40 grayscale">
            {/* Minimalist Trust Badges */}
            <div className="h-4 w-4 bg-foreground rounded-full" title="ISO Certified" />
            <div className="h-4 w-4 bg-foreground rounded-sm" title="GDPR Compliant" />
          </div>
        </footer>
      </div>
    </div>
  );
}