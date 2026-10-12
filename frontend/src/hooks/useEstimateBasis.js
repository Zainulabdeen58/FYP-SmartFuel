import api from "../api";
import useFetch from "./useFetch";

// What a vehicle's trip estimates are based on: km/l, tank range and latest fuel price.
function useEstimateBasis(vehicleId) {
  return useFetch(
    async () => {
      const { data } = await api.get("/trips/estimate-basis", { params: { vehicle: vehicleId } });
      return data.basis;
    },
    [vehicleId],
    { immediate: Boolean(vehicleId) },
  );
}

export default useEstimateBasis;
