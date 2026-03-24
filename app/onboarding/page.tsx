"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Rocket } from "lucide-react";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleOnboarding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/agency/onboard", {
      method: "POST",
      body: JSON.stringify({
        agencyName: formData.get("agencyName"),
        operatorName: session?.user?.name,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      await update(); // Refresh session to include new agencyId
      router.push("/dashboard");
    } else {
      alert("Deployment failed. Check console.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 bg-card p-10 rounded-[2.5rem] border border-border shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 mb-6">
            <Rocket size={32} />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Initialize Workspace</h1>
          <p className="text-muted-foreground text-sm mt-2">Create your agency environment to start managing projects.</p>
        </div>

        <form onSubmit={handleOnboarding} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Agency Brand Name</label>
            <input
              name="agencyName"
              required
              className="w-full bg-muted/50 p-4 rounded-2xl border border-border outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              placeholder="e.g. Nexa Media Group"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Finalize Deployment"}
          </button>
        </form>
      </div>
    </div>
  );
}