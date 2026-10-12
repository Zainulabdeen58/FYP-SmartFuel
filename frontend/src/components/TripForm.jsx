import { useEffect, useRef, useState } from "react";
import api from "../api";
import {
  EMPTY_TRIP,
  MAX_TRIP_PURPOSE_LENGTH,
  MILEAGE_SOURCE_LABELS,
  NUMBER_INPUT_PROPS,
  TRIP_PRIORITIES,
  TRIP_PRIORITY_LABELS,
} from "../constant";
import { formatDay, formatVehicleLabel } from "../format";
import useEstimateBasis from "../hooks/useEstimateBasis";
import useForm from "../hooks/useForm";
import {
  checkDifferentPlaces,
  checkFuelPrice,
  checkPlace,
  checkTripDate,
  checkTripPriority,
  checkTripPurpose,
  isInPakistan,
  todayInPakistan,
} from "../validation";
import Icon from "./Icon";
import PlaceField from "./PlaceField";
import TripMap from "./TripMap";

function toFormValues(trip, defaultVehicle) {
  if (!trip) return { ...EMPTY_TRIP, vehicle: defaultVehicle, date: todayInPakistan() };

  return {
    vehicle: trip.vehicle?._id || trip.vehicle,
    start: trip.start,
    destination: trip.destination,
    // Stored as UTC midnight, so the first 10 characters are the chosen day.
    date: trip.date.slice(0, 10),
    priority: trip.priority,
    purpose: trip.purpose || "",
    pricePerLitre: trip.pricePerLitre ?? "",
  };
}

function priceHint(basis, loading) {
  if (loading) return "Checking this vehicle's latest fuel entry...";
  if (!basis) return "";
  const mileage = `Fuel is estimated with ${basis.kmPerLitre} km/l (${MILEAGE_SOURCE_LABELS[basis.mileageSource]}).`;
  if (!basis.latestPrice) return `No fuel entry in the last 12 months: enter today's price. ${mileage}`;
  return `From your fuel entry on ${formatDay(basis.latestPrice.date)}; change it if today's price is different. ${mileage}`;
}

// Plans a trip or edits a planned one. The routes and fuel are worked out by the
// server when the trip is saved. `vehicles` are the user's own.
function TripForm({ trip = null, vehicles, onSave, onCancel }) {
  const isEdit = Boolean(trip);
  const savedDate = trip?.date.slice(0, 10);
  const isElectricVehicle = (vehicleId) => vehicles.find((v) => v._id === vehicleId)?.fuelType === "Electric";

  const { form, setForm, fieldErrors, error, loading, updateField, validateField, handleSubmit } = useForm({
    initialValues: toFormValues(trip, vehicles[0]?._id || ""),
    // Same rules as the server. On edit an unchanged date is not checked, so a trip
    // whose day has passed can still be edited.
    validate: (values) => ({
      vehicle: values.vehicle ? "" : "Select a vehicle",
      start: checkPlace(values.start, "Start"),
      destination:
        checkPlace(values.destination, "Destination") || checkDifferentPlaces(values.start, values.destination),
      date: values.date === savedDate ? "" : checkTripDate(values.date, "planned"),
      priority: checkTripPriority(values.priority),
      purpose: checkTripPurpose(values.purpose),
      pricePerLitre: isElectricVehicle(values.vehicle) ? "" : checkFuelPrice(values.pricePerLitre),
    }),
    onSubmit: async (values) => {
      const payload = {
        vehicle: values.vehicle,
        start: values.start,
        destination: values.destination,
        date: values.date,
        priority: values.priority,
        // "" clears it.
        purpose: values.purpose.trim(),
        ...(!isElectricVehicle(values.vehicle) && { pricePerLitre: Number(values.pricePerLitre) }),
      };

      const { data } = isEdit ? await api.put(`/trips/${trip._id}`, payload) : await api.post("/trips", payload);
      onSave(data.trip);
    },
    errorMessage: "Could not save trip",
  });

  const isElectric = isElectricVehicle(form.vehicle);
  const { data: basis, loading: basisLoading } = useEstimateBasis(form.vehicle);

  // The price follows the vehicle's latest fuel entry until the user types their own.
  const autoFilledPrice = useRef(null);
  useEffect(() => {
    if (!basis) return;
    const isUntouched = form.pricePerLitre === "" || form.pricePerLitre === autoFilledPrice.current;
    if (!isUntouched) return;
    const latestPrice = basis.latestPrice ? String(basis.latestPrice.pricePerLitre) : "";
    autoFilledPrice.current = latestPrice;
    updateField("pricePerLitre", latestPrice);
  }, [basis]);

  // Map clicks fill the field whose "Map" button was pressed, otherwise the first empty place.
  const [pickTarget, setPickTarget] = useState(null);
  const [mapError, setMapError] = useState("");
  const clickTarget = pickTarget || (!form.start ? "start" : !form.destination ? "destination" : null);

  const pickPoint = async (point) => {
    if (!clickTarget) return;
    if (!isInPakistan(point.lat, point.lng)) {
      setMapError("Pick a point in Pakistan.");
      return;
    }
    setMapError("");
    setPickTarget(null);
    updateField(clickTarget, { name: `Pinned point ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`, ...point });

    // Then ask for a real name; it is used only if that point is still chosen.
    try {
      const { data } = await api.get("/places/reverse", { params: point });
      if (!data.place) return;
      setForm((values) => {
        const place = values[clickTarget];
        const isSamePoint = place && place.lat === point.lat && place.lng === point.lng;
        return isSamePoint ? { ...values, [clickTarget]: { ...place, name: data.place.name } } : values;
      });
    } catch {
      // No name service: keep "Pinned point …", which the user can rename.
    }
  };

  const placeField = (key, label) => (
    <PlaceField
      id={`trip-${key}`}
      label={label}
      place={form[key]}
      error={fieldErrors[key]}
      isPicking={pickTarget === key}
      onChange={(place) => updateField(key, place)}
      onPickOnMap={() => setPickTarget(pickTarget === key ? null : key)}
    />
  );

  return (
    <form className="chart-card trip-form" onSubmit={handleSubmit} noValidate>
      <div className="chart-card-header">
        <span className="eyebrow">{isEdit ? "EDIT TRIP" : "NEW TRIP"}</span>
        <h3>{isEdit ? "Edit trip" : "Plan a trip"}</h3>
        <p>Routes, fuel and cost are worked out when you save.</p>
      </div>

      <div className="trip-form-grid">
        <div className="trip-form-fields">
          <div className="field">
            <label htmlFor="trip-vehicle">Vehicle</label>
            <select
              id="trip-vehicle"
              value={form.vehicle}
              className={fieldErrors.vehicle ? "invalid" : ""}
              onChange={(e) => updateField("vehicle", e.target.value)}
            >
              <option value="" disabled>
                Select a vehicle
              </option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {formatVehicleLabel(v)}
                  {v.fuelType === "Electric" ? " · Electric" : ""}
                </option>
              ))}
            </select>
            {fieldErrors.vehicle && <span className="field-error">{fieldErrors.vehicle}</span>}
          </div>

          {placeField("start", "Start")}
          {placeField("destination", "Destination")}

          <div className="trip-form-row">
            <div className="field">
              <label htmlFor="trip-date">Date</label>
              <input
                id="trip-date"
                type="date"
                min={todayInPakistan()}
                value={form.date}
                className={fieldErrors.date ? "invalid" : ""}
                onChange={(e) => updateField("date", e.target.value)}
                onBlur={() => validateField("date")}
              />
              {fieldErrors.date && <span className="field-error">{fieldErrors.date}</span>}
            </div>

            <div className="field">
              <label htmlFor="trip-priority">Priority</label>
              <select
                id="trip-priority"
                value={form.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              >
                {TRIP_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {TRIP_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
              {fieldErrors.priority && <span className="field-error">{fieldErrors.priority}</span>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="trip-purpose">Purpose (optional)</label>
            <input
              id="trip-purpose"
              type="text"
              maxLength={MAX_TRIP_PURPOSE_LENGTH}
              placeholder="e.g. Office meeting"
              value={form.purpose}
              className={fieldErrors.purpose ? "invalid" : ""}
              onChange={(e) => updateField("purpose", e.target.value)}
            />
            {fieldErrors.purpose && <span className="field-error">{fieldErrors.purpose}</span>}
          </div>

          {isElectric ? (
            <p className="field-hint">Electric vehicle: the trip shows routes, distance and time, but no fuel estimate.</p>
          ) : (
            <div className="field">
              <label htmlFor="trip-price">Fuel price (Rs per litre)</label>
              <input
                id="trip-price"
                {...NUMBER_INPUT_PROPS}
                placeholder="e.g. 265"
                value={form.pricePerLitre}
                className={fieldErrors.pricePerLitre ? "invalid" : ""}
                onChange={(e) => updateField("pricePerLitre", e.target.value)}
                onBlur={() => validateField("pricePerLitre")}
              />
              {fieldErrors.pricePerLitre && <span className="field-error">{fieldErrors.pricePerLitre}</span>}
              <span className="field-hint">{priceHint(basis, basisLoading)}</span>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancel
            </button>

            <button className="submit-button small" disabled={loading}>
              {loading ? "Saving and finding routes..." : isEdit ? "Update trip" : "Save trip"}
              {!loading && <Icon name="check" size={17} />}
            </button>
          </div>
        </div>

        <div className="trip-form-map">
          <TripMap start={form.start} destination={form.destination} onPickPoint={pickPoint} />
          <span className="field-hint">
            {clickTarget
              ? `Click the map to set the ${clickTarget}.`
              : "Press Map next to a place to pick it on the map."}
          </span>
          {mapError && <span className="field-error">{mapError}</span>}
        </div>
      </div>
    </form>
  );
}

export default TripForm;
