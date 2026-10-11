import api from "../api";
import useFetch from "./useFetch";

function useFuelReport(filters) {
  return useFetch(
    async () => {
      const filledFilters = Object.entries(filters).filter(([, value]) => value);
      const { data } = await api.get("/reports", { params: Object.fromEntries(filledFilters) });
      return data.report;
    },
    [filters.from, filters.to, filters.vehicle, filters.fuelType, filters.user],
  );
}

export default useFuelReport;
