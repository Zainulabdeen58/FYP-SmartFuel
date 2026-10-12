import api from "../api";
import useFetch from "./useFetch";

// Searches places when asked (the Search button), not while typing, to save the
// route service's daily quota. `search(text)` returns the places found.
function usePlaceSearch() {
  const { data, setData, error, setError, loading, reload } = useFetch(
    async (text) => {
      const { data } = await api.get("/places/search", { params: { text } });
      return data.places;
    },
    [],
    { immediate: false },
  );

  const clear = () => {
    setData(null);
    setError("");
  };

  return { places: data, error, searching: loading, search: reload, clear };
}

export default usePlaceSearch;
