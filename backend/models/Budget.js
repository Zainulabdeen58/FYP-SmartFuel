import mongoose from "mongoose";
import { MAX_BUDGET_AMOUNT } from "../../shared/constants.js";

// Monthly fuel budget (FR-08). vehicle null = the month's overall (fleet) budget;
// a vehicle id = that vehicle's budget (Organizational only). Spending is never stored.
const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // "YYYY-MM" in Pakistan time.
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

// One overall budget and one per vehicle, per user and month.
budgetSchema.index({ user: 1, month: 1, vehicle: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);
