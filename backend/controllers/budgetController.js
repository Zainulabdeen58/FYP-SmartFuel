import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Vehicle from "../models/Vehicle.js";
import { formatRupees } from "../../shared/format.js";
import { getBudgetStatus, loadMonthSpending } from "../utils/budgetStatus.js";
import { notifyBudgetLimits } from "../utils/notifications.js";
import { roundToTwoDecimals } from "../utils/numbers.js";
import {
  checkBudgetAmount,
  checkBudgetMonth,
  currentMonthInPakistan,
  firstError,
  isValidMonth
} from "../utils/validation.js";

// The routes block admins, so every query here is limited to req.user's own budgets.
// "Overall budget" = the month's budget with no vehicle (the fleet budget for Organizational accounts).

function compareSpendingWithBudget(spentAmount, budget) {
  if (!budget) return { spent: spentAmount, budget: null };

  return {
    spent: spentAmount,
    budget: {
      _id: budget._id,
      amount: budget.amount,
      remaining: roundToTwoDecimals(budget.amount - spentAmount),
      percentUsed: Math.round((spentAmount / budget.amount) * 100),
      status: getBudgetStatus(spentAmount, budget.amount)
    }
  };
}

// excludedVehicleId leaves out the vehicle being changed, so its old amount isn't counted.
function sumVehicleBudgets(monthBudgets, excludedVehicleId) {
  return monthBudgets
    .filter((budget) => budget.vehicle && !budget.vehicle.equals(excludedVehicleId))
    .reduce((total, budget) => total + budget.amount, 0);
}

// Returns { vehicle } (user's own, not electric) or { status, message } for the error.
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

// GET /budgets?month=YYYY-MM (default: current month, Pakistan time)
export async function getMonthlyBudgetSummary(req, res) {
  const month = req.query.month ?? currentMonthInPakistan();
  if (!isValidMonth(month)) {
    return res.status(400).json({ success: false, message: "Enter a valid month (YYYY-MM)" });
  }

  const userId = req.user._id;
  const isOrganizationAccount = req.user.role === "Organizational";

  const [monthBudgets, spending, userVehicles] = await Promise.all([
    Budget.find({ user: userId, month }),
    loadMonthSpending(userId, month),
    // Only Organizational accounts get a budget per vehicle.
    isOrganizationAccount
      ? Vehicle.find({ user: userId }).select("vehicleName registrationNumber fuelType").sort({ vehicleName: 1 })
      : []
  ]);

  const getVehicleSpending = (vehicleId) => spending.perVehicle.get(String(vehicleId)) ?? 0;
  const getVehicleBudget = (vehicleId) => monthBudgets.find((budget) => budget.vehicle?.equals(vehicleId));

  const overallBudget = monthBudgets.find((budget) => budget.vehicle === null);

  const vehicleSummaries = userVehicles
    // Electric vehicles show only if they still have spending or a budget from before a fuel-type change.
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
      overall: compareSpendingWithBudget(spending.total, overallBudget),
      vehicles: vehicleSummaries
    }
  });
}

// PUT /budgets { month, amount, vehicle? }: creates the budget or replaces its amount.
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
    // The fleet budget can't be lower than the vehicle budgets' total.
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

    // All vehicle budgets (with this new amount) must fit in the fleet budget.
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
  // A lower budget may already be nearly used or exceeded.
  await notifyBudgetLimits(req.user._id, month);
  res.json({ success: true, message: "Budget saved", budget });
}

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
