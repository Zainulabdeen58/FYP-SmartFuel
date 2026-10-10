import { useState } from "react";
import api from "../api";
import { MAX_BUDGET_MONTHS_AHEAD } from "../constant";
import { formatMonthLabel, formatRupees } from "../format";
import useMonthlyBudgetSummary from "../hooks/useMonthlyBudgetSummary";
import { addMonths, checkBudgetMonth, currentMonthInPakistan } from "../validation";
import BudgetAlerts from "./BudgetAlerts";
import BudgetForm from "./BudgetForm";
import Icon from "./Icon";

// Months in the month picker: the last 11 months (view only), this month and
// the months ahead that can be planned.
function getSelectableMonths() {
  const currentMonth = currentMonthInPakistan();
  const monthCount = 12 + MAX_BUDGET_MONTHS_AHEAD;
  return Array.from({ length: monthCount }, (_, index) => addMonths(currentMonth, index - 11));
}

// Green, amber or red bar for how much of a budget is used (full at 100%).
function BudgetProgressBar({ budget }) {
  return (
    <div className="budget-bar">
      <span className={budget.status} style={{ width: `${Math.min(budget.percentUsed, 100)}%` }} />
    </div>
  );
}

// "Rs 2,000 left" or "Rs 500 over".
const formatRemaining = (budget) =>
  budget.remaining < 0
    ? `${formatRupees(-budget.remaining)} over`
    : `${formatRupees(budget.remaining)} left`;

// Monthly fuel budget on the dashboard (FR-08): the month's overall budget
// and, for Organizational accounts, a budget per vehicle.
function BudgetCard({ user }) {
  const isOrganizationAccount = user.role === "Organizational";
  const [selectedMonth, setSelectedMonth] = useState(currentMonthInPakistan);
  // The props for BudgetForm ({ title, vehicle, budget, hint }) while it is open; null when closed.
  const [budgetFormProps, setBudgetFormProps] = useState(null);

  const {
    data: summary,
    error,
    setError,
    reload: reloadSummary,
  } = useMonthlyBudgetSummary(selectedMonth);

  // The card shows summary.month, the month the data belongs to. It equals
  // selectedMonth once that month's answer has arrived.
  const overallBudget = summary?.overall.budget;
  const overallBudgetName = isOrganizationAccount ? "Fleet budget" : "Monthly budget";
  const vehicleBudgetsTotal = (summary?.vehicles || [])
    .filter((vehicleSummary) => vehicleSummary.budget)
    .reduce((total, vehicleSummary) => total + vehicleSummary.budget.amount, 0);

  const openOverallBudgetForm = () =>
    setBudgetFormProps({
      title: `${overallBudget ? "Edit" : "Set"} ${overallBudgetName.toLowerCase()}`,
      vehicle: null,
      budget: overallBudget,
      hint: vehicleBudgetsTotal
        ? `Vehicle budgets add up to ${formatRupees(vehicleBudgetsTotal)}, so the fleet budget must be at least that.`
        : "",
    });

  const openVehicleBudgetForm = (vehicleSummary) => {
    const otherVehiclesTotal = vehicleBudgetsTotal - (vehicleSummary.budget?.amount || 0);
    const freeAmount = Math.max(overallBudget.amount - otherVehiclesTotal, 0);

    setBudgetFormProps({
      title: `${vehicleSummary.vehicle.vehicleName} (${vehicleSummary.vehicle.registrationNumber})`,
      vehicle: vehicleSummary.vehicle,
      budget: vehicleSummary.budget,
      hint: `Fleet budget ${formatRupees(overallBudget.amount)}. Other vehicles have ${formatRupees(otherVehiclesTotal)}, so up to ${formatRupees(freeAmount)} is free for this vehicle.`,
    });
  };

  const removeBudget = async (budget, budgetName) => {
    if (!confirm(`Remove the ${budgetName} for ${formatMonthLabel(summary.month)}?`)) return;

    try {
      await api.delete(`/budgets/${budget._id}`);
      reloadSummary();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove budget");
    }
  };

  return (
    <>
      <div className="section-heading budget-heading">
        <div>
          <span className="eyebrow">MONTHLY BUDGET</span>
          <h2>Fuel budget</h2>
        </div>

        <div className="field budget-month">
          <label htmlFor="budget-month">Month</label>

          <select
            id="budget-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {getSelectableMonths().map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="budget-panel">
        {error && <div className="form-error page-error">{error}</div>}

        {summary && (
          <>
            <BudgetAlerts summary={summary} isOrganizationAccount={isOrganizationAccount} />

            <div className="budget-overall">
              <div className="budget-numbers">
                <div>
                  <span>{overallBudgetName.toUpperCase()}</span>
                  <strong>{overallBudget ? formatRupees(overallBudget.amount) : "Not set"}</strong>
                </div>

                <div>
                  <span>SPENT</span>
                  <strong>{formatRupees(summary.overall.spent)}</strong>
                </div>

                {overallBudget && (
                  <div>
                    <span>{overallBudget.remaining < 0 ? "OVER BUDGET" : "REMAINING"}</span>
                    <strong className={overallBudget.remaining < 0 ? "over-text" : ""}>
                      {formatRupees(Math.abs(overallBudget.remaining))}
                    </strong>
                  </div>
                )}
              </div>

              {overallBudget ? (
                <>
                  <BudgetProgressBar budget={overallBudget} />
                  <p className="budget-note">{overallBudget.percentUsed}% of the budget used</p>
                </>
              ) : (
                <p className="budget-note">
                  No budget set for {formatMonthLabel(summary.month)}
                  {summary.editable ? " yet." : "."}
                </p>
              )}

              {summary.editable && (
                <div className="budget-actions">
                  <button
                    className={overallBudget ? "edit-button" : "submit-button small"}
                    onClick={openOverallBudgetForm}
                  >
                    <Icon name={overallBudget ? "edit" : "plus"} size={16} />
                    {overallBudget ? "Edit budget" : "Set budget"}
                  </button>

                  {overallBudget && (
                    <button
                      className="delete-button"
                      onClick={() => removeBudget(overallBudget, overallBudgetName.toLowerCase())}
                    >
                      <Icon name="trash" size={16} />
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>

            {isOrganizationAccount && (
              <div className="budget-vehicles">
                <h3>Vehicle budgets</h3>

                {summary.editable && !overallBudget && (
                  <p className="budget-note">Set the fleet budget first, then give vehicles their own budgets.</p>
                )}

                {!summary.vehicles.length && (
                  <p className="budget-note">Add a petrol or diesel vehicle to give it a budget.</p>
                )}

                {summary.vehicles.map((vehicleSummary) => {
                  const { vehicle, spent, budget } = vehicleSummary;

                  return (
                    <div className="budget-vehicle" key={vehicle._id}>
                      <div className="budget-vehicle-name">
                        <strong>{vehicle.vehicleName}</strong>
                        <span className="vehicle-badge">{vehicle.registrationNumber}</span>
                      </div>

                      <div className="budget-vehicle-progress">
                        <p>
                          {formatRupees(spent)} spent
                          {budget
                            ? ` of ${formatRupees(budget.amount)} · ${formatRemaining(budget)}`
                            : " · no budget"}
                        </p>
                        {budget && <BudgetProgressBar budget={budget} />}
                      </div>

                      {summary.editable && overallBudget && (
                        <div className="row-actions">
                          {/* An electric vehicle is listed only for an old budget, which can just be removed. */}
                          {vehicle.fuelType !== "Electric" && (
                            <button className="edit-button" onClick={() => openVehicleBudgetForm(vehicleSummary)}>
                              <Icon name={budget ? "edit" : "plus"} size={16} />
                              {budget ? "Edit" : "Set"}
                            </button>
                          )}

                          {budget && (
                            <button
                              className="delete-button"
                              onClick={() => removeBudget(budget, `budget of ${vehicle.vehicleName}`)}
                            >
                              <Icon name="trash" size={16} />
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Why this month can't be changed: past, or too far ahead (same rule as the server). */}
            {!summary.editable && <p className="budget-note">{checkBudgetMonth(summary.month)}.</p>}
          </>
        )}
      </div>

      {budgetFormProps && (
        <BudgetForm
          key={`${summary.month}-${budgetFormProps.vehicle?._id || "overall"}`}
          month={summary.month}
          {...budgetFormProps}
          onSave={() => {
            setBudgetFormProps(null);
            reloadSummary();
          }}
          onCancel={() => setBudgetFormProps(null)}
        />
      )}
    </>
  );
}

export default BudgetCard;
