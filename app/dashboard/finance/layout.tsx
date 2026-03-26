// app/dashboard/finance/layout.tsx
import FinanceTopNav from "@/components/main/finance/financeTopNav";


export default async function FinanceDashboardLayout({ children }: { children: React.ReactNode }) {
  // Session checks here are technically redundant if the parent has them, 
  // but safe to keep for direct route security.

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. STICKY TOP NAV (Inside the main viewport) */}
      <FinanceTopNav />

      {/* 2. FINANCE CONTENT */}
      <div className=" w-full max-w-[1600px] mx-auto">
        {children}
      </div>
    </div>
  );
}