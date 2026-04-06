// components/main/task/financial-protocol.tsx
export const FinancialProtocol = ({ internalCost, margin }: { internalCost: number; margin: number }) => {
  const profitMargin = internalCost * (margin / 100);
  
  return (
    <div className="bg-foreground text-background p-8 rounded-[2.5rem] shadow-xl space-y-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Financial Protocol</h3>
      <div className="space-y-4">
        <div>
          <p className="text-[8px] font-black opacity-60 uppercase">Base Internal Cost</p>
          <p className="text-2xl font-black">${internalCost.toLocaleString()}</p>
        </div>
        <div className="pt-4 border-t border-background/10">
          <p className="text-[8px] font-black opacity-60 uppercase">Net Potential (at {margin}%)</p>
          <p className="text-2xl font-black text-emerald-400">${profitMargin.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};