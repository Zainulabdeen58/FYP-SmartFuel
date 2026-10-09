import { useCallback, useEffect, useState } from "react";

// Runs `fetcher` on mount (and whenever the dependencies change) and keeps the
// resulting data, loading and error state in one place so components don't have
// to repeat the same try/catch boilerplate.
function useFetch(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(immediate);

  const reload = useCallback(async (...args) => {
    setLoading(true);

    try {
      const result = await fetcher(...args);
      setData(result);
      setError("");
      return result;
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    if (immediate) reload();
  }, [reload]);

  return { data, setData, error, setError, loading, reload };
}

export default useFetch;
