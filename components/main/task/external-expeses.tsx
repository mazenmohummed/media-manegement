"use client";

import React from "react";

export type TaskExpenseCategory = 
  | "EQUIPMENT" | "LOCATION" | "TRANSPORT" | "CATERING" | "TALENT" | "RENTAL";

export interface TaskExpense {
  id: string;
  itemName: string;
  category: string;
  cost: number;
}

interface ExternalRentalsProps {
  expenses?: TaskExpense[];
  onAddClick: () => void;
  onDeleteExpense: (expenseId: string, cost: number) => Promise<void>;
}

const CATEGORY_LABELS: Record<string, string> = {
  EQUIPMENT: "Equipment",
  LOCATION: "Location/Studio",
  TRANSPORT: "Transport",
  CATERING: "Catering",
  TALENT: "Talent/Model",
  RENTAL: "Rental",
};

export const ExternalExpenses = ({ expenses, onAddClick, onDeleteExpense }: ExternalRentalsProps) => {
  return (
    <div className="bg-card border border-border p-8 rounded-[2.5rem] space-y-6 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          External Expenses
        </h3>
        <button
          onClick={onAddClick}
          className="text-[18px] font-black text-blue-600 hover:scale-110 active:scale-95 transition-transform bg-blue-600/10 w-8 h-8 rounded-full flex items-center justify-center"
        >
          +
        </button>
      </div>

      <div className="space-y-3">
        {expenses && expenses.length > 0 ? (
          expenses.map((expense) => (
            <div
              key={expense.id}
              className="group flex justify-between items-center bg-muted/50 p-4 rounded-2xl border border-border/50 hover:border-red-500/30 transition-all"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tight">
                  {expense.itemName}
                </span>
                <span className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">
                  {CATEGORY_LABELS[expense.category] || expense.category}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-emerald-600">
                  ${expense.cost.toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </span>
                <button
                  onClick={() => onDeleteExpense(expense.id, expense.cost)}
                  className="opacity-0 group-hover:opacity-100 text-[9px] font-black text-red-500 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/50 rounded-2xl opacity-40">
            <p className="text-[9px] font-black uppercase tracking-widest">
              No External Outlay Recorded
            </p>
          </div>
        )}
      </div>
    </div>
  );
};