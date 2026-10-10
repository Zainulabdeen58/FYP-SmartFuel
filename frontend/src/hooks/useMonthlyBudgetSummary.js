import api from "../api";
import useFetch from "./useFetch";

// Budget and fuel spending for one month ("YYYY-MM"), from GET /budgets.
// `enabled: false` skips the request (admins have no budgets).
function useMonthlyBudgetSummary(month, { enabled = true } = {}) {
  return useFetch(
    async () => {
      const { data } = await api.get("/budgets", { params: { month } });
      return data.summary;
    },
    [month],
    { immediate: enabled },
  );
}

export default useMonthlyBudgetSummary;
