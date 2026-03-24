// app/deploy/operator/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OperatorSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDeploy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const agencyData = JSON.parse(sessionStorage.getItem("pending_agency") || "{}");
    const formData = new FormData(e.currentTarget);
    const operatorData = Object.fromEntries(formData);

    const res = await fetch("/api/auth/deploy", {
      method: "POST",
      body: JSON.stringify({ ...agencyData, ...operatorData }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      sessionStorage.removeItem("pending_agency");
      router.push("/login");
    } else {
      const err = await res.json();
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-card p-10 rounded-[2.5rem] border border-border w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-1 w-12 bg-blue-600 rounded-full" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Step 02: Admin Access</span>
        </div>
        <h2 className="text-3xl font-black mb-6 uppercase italic">System Operator</h2>
        <form onSubmit={handleDeploy} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</label>
            <input name="name" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="Mazen Mohamed" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Personal Work Email</label>
            <input name="email" type="email" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="mazen@agency.com" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Secure Password</label>
            <input name="password" type="password" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="••••••••" />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest disabled:opacity-50">
            {loading ? "Initializing Terminal..." : "Launch Agency Terminal"}
          </button>
        </form>
      </div>
    </div>
  );
}