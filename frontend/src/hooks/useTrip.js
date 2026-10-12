import api from "../api";
import useFetch from "./useFetch";

// One trip with its route lines; nothing is loaded while `tripId` is empty.
function useTrip(tripId) {
  return useFetch(
    async () => {
      const { data } = await api.get(`/trips/${tripId}`);
      return data.trip;
    },
    [tripId],
    { immediate: Boolean(tripId) },
  );
}

export default useTrip;
