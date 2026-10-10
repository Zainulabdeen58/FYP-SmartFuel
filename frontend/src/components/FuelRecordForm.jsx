import { createPortal } from "react-dom";
import api from "../api";
import { EMPTY_FUEL_RECORD, FUEL_RECORD_LABELS, MAX_STATION_LENGTH } from "../constant";
import useForm from "../hooks/useForm";
import Icon from "./Icon";
import {
  checkFuelDate,
  checkOdometer,
  checkPositiveNumber,
  checkPricePerLitre,
  checkStation,
  checkTankCapacity,
  todayInPakistan,
} from "../validation";

function toFormValues(record, defaultVehicle) {
  if (!record) {
    return { ...EMPTY_FUEL_RECORD, vehicle: defaultVehicle, date: todayInPakistan() };
  }

  return {
    vehicle: record.vehicle?._id || record.vehicle || "",
    // Stored as UTC midnight of the chosen day, so the first 10 characters are that day.
    date: record.date ? record.date.slice(0, 10) : "",
    quantity: record.quantity ?? "",
    totalCost: record.totalCost ?? "",
    odometer: record.odometer ?? "",
    station: record.station || "",
  };
}

const vehicleLabel = (v) =>
  `${v.vehicleName} (${v.registrationNumber})${v.user?.fullName ? ` · ${v.user.fullName}` : ""}`;

// `vehicles` is the user's list from /vehicles (every vehicle for an admin).
function FuelRecordForm({ record = null, vehicles, defaultVehicle = "", onSave, onCancel }) {
  const isEdit = Boolean(record?._id);
  const currentVehicleId = record?.vehicle?._id || record?.vehicle;

  // Electric vehicles can't have fuel records, but an existing record keeps its vehicle listed.
  const options = vehicles.filter(
    (v) => v.fuelType !== "Electric" || v._id === currentVehicleId,
  );

  const {
    form,
    fieldErrors,
    error,
    loading,
    updateField,
    handleSubmit: submit,
  } = useForm({
    initialValues: toFormValues(record, defaultVehicle || options[0]?._id || ""),
    validate: (f) => {
      // Same as the server: the tank limit is checked only for a new entry or
      // when the vehicle or quantity is changed.
      const tankVehicle =
        isEdit && f.vehicle === currentVehicleId && Number(f.quantity) === record.quantity
          ? null
          : vehicles.find((v) => v._id === f.vehicle);

      return {
        vehicle: f.vehicle ? "" : "Select a vehicle",
        date: checkFuelDate(f.date),
        quantity:
          checkPositiveNumber(f.quantity, "Quantity") ||
          (tankVehicle ? checkTankCapacity(f.quantity, tankVehicle.fuelTankCapacity) : ""),
        totalCost:
          checkPositiveNumber(f.totalCost, "Total cost") ||
          checkPricePerLitre(f.quantity, f.totalCost),
        odometer: checkOdometer(f.odometer),
        station: checkStation(f.station),
      };
    },
    onSubmit: async (f) => {
      const payload = {
        vehicle: f.vehicle,
        date: f.date,
        quantity: Number(f.quantity),
        totalCost: Number(f.totalCost),
        // Empty optional fields are sent as "" so an edit can clear them.
        odometer: f.odometer === "" ? "" : Number(f.odometer),
        station: f.station.trim(),
      };

      const { data } = isEdit
        ? await api.put(`/fuel-records/${record._id}`, payload)
        : await api.post("/fuel-records", payload);

      onSave(data.record);
    },
    errorMessage: "Could not save fuel record",
  });

  const quantity = Number(form.quantity);
  const totalCost = Number(form.totalCost);
  const pricePerLitre = quantity > 0 && totalCost > 0 ? totalCost / quantity : null;

  const renderInput = (key, type, extra = {}) => (
    <div className="field" key={key}>
      <label htmlFor={`fuel-${key}`}>{FUEL_RECORD_LABELS[key]}</label>

      <input
        id={`fuel-${key}`}
        type={type}
        value={form[key]}
        className={fieldErrors[key] ? "invalid" : ""}
        onChange={(e) => updateField(key, e.target.value)}
        {...extra}
      />

      {fieldErrors[key] && <span className="field-error">{fieldErrors[key]}</span>}
    </div>
  );

  return createPortal(
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <form
        className="vehicle-modal"
        onSubmit={submit}
        noValidate
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">{isEdit ? "UPDATE RECORD" : "NEW RECORD"}</span>
            <h2>{isEdit ? "Edit fuel entry" : "Add fuel entry"}</h2>
            <p>
              {isEdit
                ? "Update this fuel purchase."
                : "Record a fuel purchase for one of your vehicles."}
            </p>
          </div>

          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="vehicle-form-grid">
          <div className="field">
            <label htmlFor="fuel-vehicle">{FUEL_RECORD_LABELS.vehicle}</label>

            <select
              id="fuel-vehicle"
              value={form.vehicle}
              className={fieldErrors.vehicle ? "invalid" : ""}
              onChange={(e) => updateField("vehicle", e.target.value)}
            >
              <option value="" disabled>
                Select a vehicle
              </option>
              {options.map((v) => (
                <option key={v._id} value={v._id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </select>

            {fieldErrors.vehicle && <span className="field-error">{fieldErrors.vehicle}</span>}
          </div>

          {renderInput("date", "date", { max: todayInPakistan() })}
          {renderInput("quantity", "number", { min: "0", step: "0.01", placeholder: "e.g. 30" })}
          {renderInput("totalCost", "number", { min: "0", step: "0.01", placeholder: "e.g. 8000" })}
          {renderInput("odometer", "number", { min: "0", placeholder: "e.g. 45210" })}
          {renderInput("station", "text", { maxLength: MAX_STATION_LENGTH, placeholder: "e.g. PSO, Main Boulevard" })}
        </div>

        <p className="fuel-price-preview">
          Price per litre:{" "}
          <strong>{pricePerLitre === null ? "—" : `Rs ${pricePerLitre.toFixed(2)}`}</strong>
        </p>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>

          <button className="submit-button small" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update entry" : "Save entry"}
            {!loading && <Icon name="check" size={17} />}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export default FuelRecordForm;
