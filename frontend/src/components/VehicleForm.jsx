import { createPortal } from "react-dom";
import api from "../api";
import {
  EMPTY_VEHICLE,
  FUEL_TYPES,
  NUMBER_FIELDS,
  VEHICLE_LABELS,
  VEHICLE_LIMITS,
} from "../constant";
import useForm from "../hooks/useForm";
import Icon from "./Icon";
import {
  checkFuelEfficiency,
  checkFuelTankCapacity,
  checkFuelType,
  checkManufacturer,
  checkModelYear,
  checkRegistrationNumber,
  checkVehicleName,
} from "../validation";

function toFormValues(vehicle) {
  if (!vehicle) return EMPTY_VEHICLE;

  return {
    vehicleName: vehicle.vehicleName || "",
    registrationNumber: vehicle.registrationNumber || "",
    manufacturer: vehicle.manufacturer || "",
    modelYear: vehicle.modelYear ?? "",
    fuelType: vehicle.fuelType || "Petrol",
    fuelEfficiency: vehicle.fuelEfficiency ?? "",
    fuelTankCapacity: vehicle.fuelTankCapacity ?? "",
  };
}

function VehicleForm({ vehicle = null, onSave, onCancel }) {
  const isEdit = Boolean(vehicle?._id);

  const {
    form,
    fieldErrors,
    error,
    loading,
    updateField,
    handleSubmit: submit,
  } = useForm({
    initialValues: toFormValues(vehicle),
    validate: (f) => ({
      vehicleName: checkVehicleName(f.vehicleName),
      registrationNumber: checkRegistrationNumber(f.registrationNumber),
      manufacturer: checkManufacturer(f.manufacturer),
      modelYear: checkModelYear(f.modelYear),
      fuelType: checkFuelType(f.fuelType),
      fuelEfficiency: checkFuelEfficiency(f.fuelEfficiency),
      fuelTankCapacity: checkFuelTankCapacity(f.fuelTankCapacity),
    }),
    onSubmit: async (f) => {
      const payload = {
        ...f,
        modelYear: Number(f.modelYear),
        fuelEfficiency: Number(f.fuelEfficiency),
        fuelTankCapacity: Number(f.fuelTankCapacity),
        registrationNumber: f.registrationNumber.trim().toUpperCase(),
      };

      const { data } = isEdit
        ? await api.put(`/vehicles/${vehicle._id}`, payload)
        : await api.post("/vehicles", payload);

      onSave(data.vehicle);
    },
    errorMessage: "Could not save vehicle",
  });

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <form
        className="vehicle-modal"
        onSubmit={submit}
        noValidate
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              {isEdit ? "UPDATE RECORD" : "NEW RECORD"}
            </span>
            <h2>{isEdit ? "Edit vehicle" : "Add vehicle"}</h2>
            <p>
              {isEdit
                ? "Update the vehicle information below."
                : "Enter the vehicle information below."}
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="vehicle-form-grid">
          {Object.entries(form).map(([key, value]) =>
            key === "fuelType" ? (
              <div className="field" key={key}>
                <label>{VEHICLE_LABELS[key]}</label>

                <select
                  value={value}
                  className={fieldErrors[key] ? "invalid" : ""}
                  onChange={(e) => updateField(key, e.target.value)}
                >
                  {FUEL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                {fieldErrors[key] && (
                  <span className="field-error">{fieldErrors[key]}</span>
                )}
              </div>
            ) : (
              <div className="field" key={key}>
                <label>{VEHICLE_LABELS[key]}</label>

                <input
                  type={NUMBER_FIELDS.includes(key) ? "number" : "text"}
                  placeholder={`Enter ${VEHICLE_LABELS[key].toLowerCase()}`}
                  value={value}
                  maxLength={VEHICLE_LIMITS[key]?.max}
                  className={fieldErrors[key] ? "invalid" : ""}
                  onChange={(e) => updateField(key, e.target.value)}
                />

                {fieldErrors[key] && (
                  <span className="field-error">{fieldErrors[key]}</span>
                )}
              </div>
            ),
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>

          <button className="submit-button small" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update vehicle" : "Save vehicle"}
            {!loading && <Icon name="check" size={17} />}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export default VehicleForm;
