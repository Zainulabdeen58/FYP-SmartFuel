import { formatMonthLabel, formatRupees } from "../format";

// The alert text for a budget that is 80% or more used.
// `spending` is { spent, budget } from GET /budgets.
function buildAlertMessage(budgetName, { spent, budget }) {
  const spentOfBudget = `${formatRupees(spent)} of ${formatRupees(budget.amount)}`;

  if (budget.status === "warning") return `${budgetName}: ${budget.percentUsed}% used (${spentOfBudget})`;
  if (budget.remaining < 0) return `${budgetName}: over by ${formatRupees(-budget.remaining)} (${spentOfBudget})`;
  return `${budgetName}: fully used (${spentOfBudget})`;
}

// Yellow (80%+) and red (100%+) alerts for the month's overall budget and
// each vehicle budget. They show for as long as the spending stays that high.
function BudgetAlerts({ summary, isOrganizationAccount }) {
  if (!summary) return null;

  const overallBudgetName = `${formatMonthLabel(summary.month)} ${isOrganizationAccount ? "fleet budget" : "budget"}`;

  const budgetsToCheck = [
    { key: "overall", budgetName: overallBudgetName, spending: summary.overall },
    ...summary.vehicles.map((vehicleSummary) => ({
      key: vehicleSummary.vehicle._id,
      budgetName: `${vehicleSummary.vehicle.vehicleName} (${vehicleSummary.vehicle.registrationNumber}) budget`,
      spending: vehicleSummary,
    })),
  ];
  const alerts = budgetsToCheck.filter(({ spending }) => spending.budget && spending.budget.status !== "ok");

  if (!alerts.length) return null;

  return (
    <div className="budget-alerts" role="status">
      {alerts.map(({ key, budgetName, spending }) => (
        <div key={key} className={`budget-alert ${spending.budget.status}`}>
          {buildAlertMessage(budgetName, spending)}
        </div>
      ))}
    </div>
  );
}

export default BudgetAlerts;
