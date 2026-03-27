"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Rocket } from "lucide-react";
import { Suspense } from "react";

function AgencyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "FREE";

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const agencyData = Object.fromEntries(formData);
    
    // Save agency data PLUS the selected plan
    sessionStorage.setItem("pending_agency", JSON.stringify({
      ...agencyData,
      plan: selectedPlan
    }));
    
    router.push("/deploy/operator");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-card p-10 rounded-[2.5rem] border border-border w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-1 w-12 bg-blue-600 rounded-full" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
            Step 01: Brand Identity ({selectedPlan})
          </span>
        </div>
        <h2 className="text-3xl font-black mb-6 uppercase italic">Initialize Agency</h2>
        <form onSubmit={handleNext} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Agency Name</label>
            <input name="agencyName" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="Creative Flow Media" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Agency Email</label>
            <input name="agencyEmail" type="email" required className="w-full bg-muted/30 p-4 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-600" placeholder="contact@agency.com" />
          </div>
          <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
            Continue to Operator Setup <Rocket size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

// Wrap in Suspense because of useSearchParams
export default function AgencySignup() {
  return (
    <Suspense fallback={<div>Loading Deployment...</div>}>
      <AgencyForm />
    </Suspense>
  );
}