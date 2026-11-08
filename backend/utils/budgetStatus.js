// How much of a budget is used. Shared by the budget summary (GET /budgets), the crisis
// mode budget check and the budget notifications, so all three agree.
import { BUDGET_WARNING_PERCENT } from "../../shared/constants.js";
import FuelRecord from "../models/FuelRecord.js";
import { getMonthDateRange } from "./dates.js";
import { roundToTwoDecimals } from "./numbers.js";

// "ok", "warning" from BUDGET_WARNING_PERCENT (80%) or "over" from 100%.
export function getBudgetStatus(spentAmount, budgetAmount) {
  const percentUsed = (spentAmount / budgetAmount) * 100;
  if (percentUsed >= 100) return "over";
  if (percentUsed >= BUDGET_WARNING_PERCENT) return "warning";
  return "ok";
}

// A user's fuel spending in one month ("YYYY-MM"): the total, and a Map of vehicle id → rupees.
// Spending is never stored; it is added up from the fuel records every time.
export async function loadMonthSpending(userId, month) {
  const { monthStart, nextMonthStart } = getMonthDateRange(month);
  const rows = await FuelRecord.aggregate([
    { $match: { user: userId, date: { $gte: monthStart, $lt: nextMonthStart } } },
    { $group: { _id: "$vehicle", spent: { $sum: "$totalCost" } } }
  ]);

  return {
    total: roundToTwoDecimals(rows.reduce((total, row) => total + row.spent, 0)),
    perVehicle: new Map(rows.map((row) => [String(row._id), roundToTwoDecimals(row.spent)]))
  };
}
