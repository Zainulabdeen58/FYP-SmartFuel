import { useSearchParams } from "react-router-dom";
import { DEFAULT_REPORT_MONTHS } from "../constant";
import { currentMonthInPakistan, firstMonthOfRange } from "../validation";

// Filters live in the URL, so they survive a refresh and a copied link opens the same report.
function useReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMonth = currentMonthInPakistan();

  const filters = {
    from: searchParams.get("from") || firstMonthOfRange(currentMonth, DEFAULT_REPORT_MONTHS),
    to: searchParams.get("to") || currentMonth,
    vehicle: searchParams.get("vehicle") || "",
    fuelType: searchParams.get("fuelType") || "",
    user: searchParams.get("user") || "",
  };

  // Starts from window.location.search, not this render's `filters`, so two quick
  // changes (From, then To) before a re-render don't undo each other.
  const updateFilters = (changes) => {
    const nextParams = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(changes)) {
      if (value) nextParams.set(name, value);
      else nextParams.delete(name);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => setSearchParams({}, { replace: true });

  return { filters, updateFilters, resetFilters };
}

export default useReportFilters;
