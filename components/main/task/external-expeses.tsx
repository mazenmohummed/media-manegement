// components/main/task/external-expeses.tsx

interface TaskExpense {
  id: string;
  itemName: string;
  category: string;
  cost: number;
}

interface ExternalRentalsProps {
  expenses?: TaskExpense[];
  onAddClick: () => void;
}

export const ExternalExpenses = ({ expenses, onAddClick }: ExternalRentalsProps) => {
  return (
    <div className="bg-card border border-border p-8 rounded-[2.5rem] space-y-6 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          External Rentals
        </h3>
        <button
          onClick={onAddClick}
          className="text-[18px] font-black text-blue-600 hover:scale-125 transition-transform bg-blue-600/10 w-8 h-8 rounded-full flex items-center justify-center"
        >
          +
        </button>
      </div>

      <div className="space-y-3">
        {expenses && expenses.length > 0 ? (
          expenses.map((expense) => (
            <div
              key={expense.id}
              className="group flex justify-between items-center bg-muted/50 p-4 rounded-2xl border border-border/50 hover:border-blue-500/30 transition-all"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase">
                  {expense.itemName}
                </span>
                <span className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">
                  {expense.category}
                </span>
              </div>
              <span className="text-xs font-black text-emerald-600">
                ${expense.cost}
              </span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 opacity-30">
            <p className="text-[10px] font-black uppercase">No external assets</p>
          </div>
        )}
      </div>
    </div>
  );
};