import api from "../api";
import useFetch from "./useFetch";

// Crisis mode suggestions, savings and the budget check; loaded only while crisis mode is on.
function useCrisisAdvice(crisisMode) {
  return useFetch(
    async () => {
      const { data } = await api.get("/crisis");
      return data.advice;
    },
    [crisisMode],
    { immediate: Boolean(crisisMode) },
  );
}

export default useCrisisAdvice;
