import { useCallback, useEffect, useRef, useState } from "react";

// Runs `fetcher` on mount (and whenever the dependencies change) and keeps the
// resulting data, loading and error state in one place so components don't have
// to repeat the same try/catch boilerplate.
function useFetch(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(immediate);
  // Number of the newest request. Requests can overlap (e.g. the month or a
  // filter is changed twice quickly) and answer out of order; only the newest
  // one may update the state, so a slow old answer can't replace newer data.
  const latestRequestNumber = useRef(0);

  const reload = useCallback(async (...args) => {
    const requestNumber = ++latestRequestNumber.current;
    const isLatestRequest = () => requestNumber === latestRequestNumber.current;
    setLoading(true);

    try {
      const result = await fetcher(...args);
      if (isLatestRequest()) {
        setData(result);
        setError("");
      }
      return result;
    } catch (err) {
      if (isLatestRequest()) setError(err.response?.data?.message || "Something went wrong");
    } finally {
      if (isLatestRequest()) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    if (immediate) reload();
  }, [reload]);

  return { data, setData, error, setError, loading, reload };
}

export default useFetch;
