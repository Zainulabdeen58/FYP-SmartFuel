import { Router } from "express";
import {
  createOrUpdateBudget,
  deleteBudget,
  getMonthlyBudgetSummary
} from "../controllers/budgetController.js";
import { nonAdminOnly, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect, nonAdminOnly);
router.route("/").get(getMonthlyBudgetSummary).put(createOrUpdateBudget);
router.delete("/:id", deleteBudget);
export default router;
