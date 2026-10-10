import { createPortal } from "react-dom";
import api from "../api";
import { formatMonthLabel } from "../format";
import useForm from "../hooks/useForm";
import { checkBudgetAmount } from "../validation";
import Icon from "./Icon";

// Sets the overall budget of a month (vehicle = null) or one vehicle's budget.
// The server checks the month and that vehicle budgets fit in the fleet budget;
// its message is shown here if they don't.
function BudgetForm({ month, title, vehicle = null, budget = null, hint = "", onSave, onCancel }) {
  const { form, fieldErrors, error, loading, updateField, handleSubmit } = useForm({
    initialValues: { amount: budget?.amount ?? "" },
    validate: (values) => ({ amount: checkBudgetAmount(values.amount) }),
    onSubmit: async (values) => {
      await api.put("/budgets", {
        month,
        amount: Number(values.amount),
        ...(vehicle && { vehicle: vehicle._id }),
      });
      onSave();
    },
    errorMessage: "Could not save budget",
  });

  return createPortal(
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <form
        className="vehicle-modal budget-modal"
        onSubmit={handleSubmit}
        noValidate
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">{formatMonthLabel(month).toUpperCase()}</span>
            <h2>{title}</h2>
            <p>{budget ? "Change the budget for this month." : "Set a fuel budget for this month."}</p>
          </div>

          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="field">
          <label htmlFor="budget-amount">Budget (Rs)</label>

          <input
            id="budget-amount"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 30000"
            value={form.amount}
            className={fieldErrors.amount ? "invalid" : ""}
            onChange={(e) => updateField("amount", e.target.value)}
            autoFocus
          />

          {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}
        </div>

        {hint && <p className="budget-hint">{hint}</p>}

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>

          <button className="submit-button small" disabled={loading}>
            {loading ? "Saving..." : "Save budget"}
            {!loading && <Icon name="check" size={17} />}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export default BudgetForm;
