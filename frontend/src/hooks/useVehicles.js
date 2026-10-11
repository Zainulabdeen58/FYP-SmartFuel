import api from "../api";
import useFetch from "./useFetch";

// The user's vehicles (every vehicle for an admin).
function useVehicles() {
  return useFetch(
    async () => {
      const { data } = await api.get("/vehicles");
      return data.vehicles;
    },
    [],
    { initialData: [] },
  );
}

export default useVehicles;
