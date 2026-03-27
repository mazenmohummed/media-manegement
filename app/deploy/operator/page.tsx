"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

export default function OperatorSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingAgency, setPendingAgency] = useState<any>(null);

  useEffect(() => {
    const data = sessionStorage.getItem("pending_agency");
    if (!data) {
      router.push("/deploy/agency");
    } else {
      setPendingAgency(JSON.parse(data));
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const operatorData = Object.fromEntries(formData);

    const finalPayload = {
      ...pendingAgency,
      ...operatorData,
    };

    try {
      // 1. Call your API to create the Agency + Admin User
      const res = await fetch("/api/deploy", {
        method: "POST",
        body: JSON.stringify(finalPayload),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        // 2. Clear session storage
        sessionStorage.removeItem("pending_agency");
        
        // 3. Automatically log them in
        await signIn("credentials", {
          email: finalPayload.operatorEmail,
          password: finalPayload.password,
          callbackUrl: "/dashboard",
        });
      }
    } catch (error) {
      console.error("Deployment failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-card p-10 rounded-[2.5rem] border border-border w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-1 w-12 bg-green-500 rounded-full" />
          <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Step 02: Command Access</span>
        </div>
        
        <h2 className="text-3xl font-black mb-2 uppercase italic">Admin Operator</h2>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-8">
          Establishing credentials for <span className="text-blue-600">{pendingAgency?.agencyName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name</label>
              <input name="operatorName" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="Mazen ..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Admin Email</label>
              <input name="operatorEmail" type="email" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="admin@agency.com" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Master Password</label>
            <input name="password" type="password" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="••••••••" />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Finalize Deployment <ShieldCheck size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}