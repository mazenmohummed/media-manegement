import React from "react";

interface TaskExpense {
  cost: number;
}

interface FinancialProtocolProps {
  internalCost: number;   // Gross Revenue ($)
  margin: number;         // Target Margin (%)
  marginAmount: number;   // ((internalCost + expenses) * margin) / 100
  totalInvoice: number;   // internalCost + expenses + marginAmount
  taskNetProfit: number;  // varies by userType
  realCost: number;       // varies by userType
  taskExpenses: TaskExpense[];
}

export const FinancialProtocol = ({
  internalCost,
  margin,
  marginAmount,
  totalInvoice,
  taskNetProfit,
  realCost,
  taskExpenses,
}: FinancialProtocolProps) => {
  const totalExpenses = taskExpenses.reduce((sum, e) => sum + (e.cost || 0), 0);

  return (
    <div className="bg-foreground text-background p-8 rounded-[2.5rem] shadow-xl space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">
          Financial Protocol
        </h3>
        <span className="text-[8px] font-black bg-background/10 px-2 py-1 rounded text-emerald-400">
          MAR: {margin}%
        </span>
      </div>

      <div className="space-y-4">

        {/* ROW 1: GROSS REVENUE */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-tighter">
              Gross Revenue
            </p>
            <p className="text-lg font-black">
              ${internalCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-tighter">
              External Expenses
            </p>
            <p className="text-lg font-black text-rose-400">
              ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* ROW 2: MARGIN AMOUNT & TOTAL INVOICE */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-background/10">
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-tighter">
              Margin Amount
            </p>
            <p className="text-lg font-black text-emerald-400">
              +${marginAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-tighter">
              Total Invoice (Client)
            </p>
            <p className="text-lg font-black">
              ${totalInvoice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* ROW 3: REAL COST & NET PROFIT */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-background/10">
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-tighter">
              Real Outlay
            </p>
            <p className="text-lg font-black text-rose-400">
              -${realCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-tighter">
              Net Profit
            </p>
            <p className={`text-lg font-black ${taskNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {taskNetProfit >= 0 ? '+' : ''}${taskNetProfit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};