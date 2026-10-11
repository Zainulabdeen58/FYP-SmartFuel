import { useCallback, useEffect, useRef, useState } from "react";

// Runs `fetcher` on mount and when deps change; keeps data, loading and error state.
function useFetch(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(immediate);
  // Only the newest request may update state, so a slow older answer can't overwrite newer data.
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
