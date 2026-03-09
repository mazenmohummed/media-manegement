"use client";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      {/* Decorative Background Element */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="bg-card p-10 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-border relative z-10">
        <header className="mb-10 text-center md:text-left">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
            Agency OS v3.0
          </div>
          <h2 className="text-4xl font-black text-foreground mb-2 tracking-tight uppercase">
            Systems Entry
          </h2>
          <p className="text-muted-foreground font-medium">
            Authenticate to access the production pipeline.
          </p>
        </header>
        
        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Command Email
            </label>
            <input 
              type="email" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground placeholder:text-muted-foreground/50" 
              placeholder="operator@agency.com" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Access Key
              </label>
              <Link href="#" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                Forgot?
              </Link>
            </div>
            <input 
              type="password" 
              className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all font-medium text-foreground placeholder:text-muted-foreground/50" 
              placeholder="••••••••••••" 
            />
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] shadow-xl shadow-blue-500/20 mt-4">
            Initialize Session
          </button>
        </form>
        
        <footer className="mt-10 pt-8 border-t border-border">
          <p className="text-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
            New to the grid?{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-500 transition-colors">
              Create Account
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}