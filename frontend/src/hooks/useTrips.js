import api from "../api";
import useFetch from "./useFetch";

// The trip list (without route lines), filtered by vehicle and status.
function useTrips({ vehicle, status }) {
  return useFetch(
    async () => {
      const { data } = await api.get("/trips", { params: { vehicle, status } });
      return data.trips;
    },
    [vehicle, status],
    { initialData: [] },
  );
}

export default useTrips;
