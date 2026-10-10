import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import FuelRecord from "../models/FuelRecord.js";
import Vehicle from "../models/Vehicle.js";
import { BUDGET_WARNING_PERCENT } from "../../shared/constants.js";
import {
  checkBudgetAmount,
  checkBudgetMonth,
  currentMonthInPakistan,
  firstError,
  isValidMonth
} from "../utils/validation.js";

// Budgets belong to Individual and Organizational accounts (the routes block
// admins), so every query here is limited to the signed-in user's own data.
//
// Words used below:
// - overall budget: the month's budget that is not tied to a vehicle
//   (the "fleet budget" for an Organizational account).
// - vehicle budget: one vehicle's budget (Organizational accounts only).

// Adding decimal amounts can give 600.5999999999999 instead of 600.6;
// rounding to paisa (2 decimals) keeps totals and statuses exact.
const roundToPaisa = (amount) => Math.round(amount * 100) / 100;

const formatRupees = (amount) => `Rs ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// The month as a date range: from its first day up to (not including) the
// first day of the next month. Fuel record dates are stored as UTC midnight
// of the chosen day, so this range holds exactly the records of that month.
function getMonthDateRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    monthStart: new Date(Date.UTC(year, monthNumber - 1, 1)),
    nextMonthStart: new Date(Date.UTC(year, monthNumber, 1))
  };
}

// "ok" below 80% of the budget, "warning" from 80%, "over" from 100%.
function getBudgetStatus(spentAmount, budgetAmount) {
  const percentUsed = (spentAmount / budgetAmount) * 100;
  if (percentUsed >= 100) return "over";
  if (percentUsed >= BUDGET_WARNING_PERCENT) return "warning";
  return "ok";
}

// The spending of a month (or of one vehicle) compared with its budget.
// `budget` is null when no budget is set, and then only the spending is returned.
function compareSpendingWithBudget(spentAmount, budget) {
  if (!budget) return { spent: spentAmount, budget: null };

  return {
    spent: spentAmount,
    budget: {
      _id: budget._id,
      amount: budget.amount,
      remaining: roundToPaisa(budget.amount - spentAmount),
      percentUsed: Math.round((spentAmount / budget.amount) * 100),
      status: getBudgetStatus(spentAmount, budget.amount)
    }
  };
}

// Adds up the vehicle budgets in `monthBudgets`. `excludedVehicleId` leaves out
// the vehicle that is being changed, so its old amount is not counted.
function sumVehicleBudgets(monthBudgets, excludedVehicleId) {
  return monthBudgets
    .filter((budget) => budget.vehicle && !budget.vehicle.equals(excludedVehicleId))
    .reduce((total, budget) => total + budget.amount, 0);
}

// The vehicle a budget is for: it must be the user's own petrol or diesel vehicle.
// Returns { vehicle } or { status, message } for the error response.
async function findVehicleForBudget(req, vehicleId) {
  if (typeof vehicleId !== "string" || !mongoose.isValidObjectId(vehicleId)) {
    return { status: 400, message: "Select a valid vehicle" };
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) return { status: 404, message: "Vehicle not found" };
  if (!vehicle.user.equals(req.user._id)) return { status: 403, message: "Not authorized" };
  if (vehicle.fuelType === "Electric") {
    return { status: 400, message: "Electric vehicles do not have fuel budgets" };
  }
  return { vehicle };
}

// GET /budgets?month=YYYY-MM (default: the current month in Pakistan time)
export async function getMonthlyBudgetSummary(req, res) {
  const month = req.query.month ?? currentMonthInPakistan();
  if (!isValidMonth(month)) {
    return res.status(400).json({ success: false, message: "Enter a valid month (YYYY-MM)" });
  }

  const userId = req.user._id;
  const isOrganizationAccount = req.user.role === "Organizational";
  const { monthStart, nextMonthStart } = getMonthDateRange(month);

  const [monthBudgets, spendingPerVehicle, userVehicles] = await Promise.all([
    Budget.find({ user: userId, month }),
    // The month's fuel spending, one row per vehicle: { _id: vehicleId, spent }
    FuelRecord.aggregate([
      { $match: { user: userId, date: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: "$vehicle", spent: { $sum: "$totalCost" } } }
    ]),
    // Only Organizational accounts get a budget per vehicle.
    isOrganizationAccount
      ? Vehicle.find({ user: userId }).select("vehicleName registrationNumber fuelType").sort({ vehicleName: 1 })
      : []
  ]);

  const getVehicleSpending = (vehicleId) =>
    roundToPaisa(spendingPerVehicle.find((row) => row._id.equals(vehicleId))?.spent || 0);
  const getVehicleBudget = (vehicleId) => monthBudgets.find((budget) => budget.vehicle?.equals(vehicleId));

  const totalSpent = roundToPaisa(spendingPerVehicle.reduce((total, row) => total + row.spent, 0));
  const overallBudget = monthBudgets.find((budget) => budget.vehicle === null);

  const vehicleSummaries = userVehicles
    // Electric vehicles can't be budgeted; one is listed only if it still has
    // spending or a budget from before its fuel type was changed.
    .filter((vehicle) =>
      vehicle.fuelType !== "Electric" || getVehicleBudget(vehicle._id) || getVehicleSpending(vehicle._id) > 0
    )
    .map((vehicle) => ({
      vehicle,
      ...compareSpendingWithBudget(getVehicleSpending(vehicle._id), getVehicleBudget(vehicle._id))
    }));

  res.json({
    success: true,
    summary: {
      month,
      editable: checkBudgetMonth(month) === "",
      overall: compareSpendingWithBudget(totalSpent, overallBudget),
      vehicles: vehicleSummaries
    }
  });
}

// PUT /budgets  { month, amount, vehicle? }
// Sets the budget for that month (and vehicle): creates it, or replaces the amount.
export async function createOrUpdateBudget(req, res) {
  const { month, amount } = req.body;
  const vehicleId = req.body.vehicle ?? null;

  const inputError = firstError(checkBudgetMonth(month), checkBudgetAmount(amount));
  if (inputError) return res.status(400).json({ success: false, message: inputError });

  const newAmount = Number(amount);
  const monthBudgets = await Budget.find({ user: req.user._id, month });
  const overallBudget = monthBudgets.find((budget) => budget.vehicle === null);
  let vehicle = null;

  if (vehicleId === null) {
    // The overall budget can't drop below what the vehicle budgets already add up to.
    const vehicleBudgetsTotal = sumVehicleBudgets(monthBudgets);
    if (newAmount < vehicleBudgetsTotal) {
      return res.status(400).json({
        success: false,
        message: `Vehicle budgets for this month add up to ${formatRupees(vehicleBudgetsTotal)}, so the fleet budget cannot be less than that`
      });
    }
  } else {
    if (req.user.role !== "Organizational") {
      return res.status(400).json({ success: false, message: "Only organizational accounts can set vehicle budgets" });
    }

    const vehicleLookup = await findVehicleForBudget(req, vehicleId);
    if (!vehicleLookup.vehicle) {
      return res.status(vehicleLookup.status).json({ success: false, message: vehicleLookup.message });
    }
    vehicle = vehicleLookup.vehicle;

    if (!overallBudget) {
      return res.status(400).json({ success: false, message: "Set the fleet budget for this month first" });
    }

    // All vehicle budgets of the month, with this vehicle's new amount, must fit in the fleet budget.
    const vehicleBudgetsTotal = sumVehicleBudgets(monthBudgets, vehicle._id) + newAmount;
    if (vehicleBudgetsTotal > overallBudget.amount) {
      return res.status(400).json({
        success: false,
        message: `Vehicle budgets would add up to ${formatRupees(vehicleBudgetsTotal)}, which is more than the fleet budget of ${formatRupees(overallBudget.amount)}. Lower a vehicle budget or raise the fleet budget.`
      });
    }
  }

  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, month, vehicle: vehicle?._id ?? null },
    { amount: newAmount },
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ success: true, message: "Budget saved", budget });
}

// DELETE /budgets/:id
export async function deleteBudget(req, res) {
  const budget = await Budget.findById(req.params.id);
  if (!budget) return res.status(404).json({ success: false, message: "Budget not found" });
  if (!budget.user.equals(req.user._id)) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const monthError = checkBudgetMonth(budget.month);
  if (monthError) return res.status(400).json({ success: false, message: monthError });

  // Vehicle budgets need the fleet budget, so the fleet budget is removed last.
  const isOverallBudget = budget.vehicle === null;
  if (isOverallBudget) {
    const hasVehicleBudgets = await Budget.exists({ user: req.user._id, month: budget.month, vehicle: { $ne: null } });
    if (hasVehicleBudgets) {
      return res.status(400).json({ success: false, message: "Remove the vehicle budgets for this month first" });
    }
  }

  await budget.deleteOne();
  res.json({ success: true, message: "Budget removed" });
}
