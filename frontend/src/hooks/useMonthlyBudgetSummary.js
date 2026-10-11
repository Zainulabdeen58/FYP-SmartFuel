import api from "../api";
import useFetch from "./useFetch";

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
