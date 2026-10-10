import mongoose from "mongoose";
import { MAX_BUDGET_AMOUNT } from "../../shared/constants.js";

// A monthly fuel budget (FR-08).
// - vehicle null: the user's overall budget for the month (the fleet budget
//   for an Organizational account).
// - vehicle set: one vehicle's budget (Organizational accounts only). The
//   vehicle budgets of a month may not add up to more than the overall budget.
// Spending is not stored here; it is added up from the fuel records each time.
const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Calendar month as "YYYY-MM", in Pakistan time like fuel record dates.
    month: { type: String, required: [true, "Month is required"], match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Enter a valid month (YYYY-MM)"] },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    amount: {
      type: Number,
      required: [true, "Budget is required"],
      validate: {
        validator: (value) => value > 0 && value <= MAX_BUDGET_AMOUNT,
        message: "Budget must be greater than 0 and at most Rs 1 crore",
      },
    },
  },
  { timestamps: true }
);

// One overall budget and one budget per vehicle for each user and month.
budgetSchema.index({ user: 1, month: 1, vehicle: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);
