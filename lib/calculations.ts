// lib/calculations.ts
import { UserType } from "@prisma/client";

// lib/calculations.ts

export const calculateTaskFinance = (
  internalCost: number, // "Gross Revenue"
  marginPercentage: number, // "Target Margin (%)"
  taskExpenses: { cost: number }[],
  userType: "FULL_TIME" | "PART_TIME" | "FREELANCER" | string
) => {
  const sumExpenses = taskExpenses.reduce((sum, e) => sum + e.cost, 0);
  
  // marginAmount is ((internalCost + expenses) * margin) / 100
  const marginAmount = ((internalCost + sumExpenses) * marginPercentage) / 100;
  
  // totalValue is internalCost + expenses + marginAmount
  const totalValue = internalCost + sumExpenses + marginAmount;

  let taskNetProfit = 0;
  let realCost = 0;

  if (userType === "FULL_TIME" || userType === "PART_TIME") {
    // Profit: Total - Expenses
    taskNetProfit = totalValue - sumExpenses;
    // Real Cost: Just expenses (Labor is fixed/salary)
    realCost = sumExpenses;
  } else {
    // FREELANCER
    // Profit: Just the margin amount (Internal Cost is paid to freelancer)
    taskNetProfit = marginAmount;
    // Real Cost: Expenses + what we pay the freelancer
    realCost = sumExpenses + internalCost;
  }

  return {
    sumExpenses,
    marginAmount,
    totalValue,
    taskNetProfit,
    realCost
  };
};