import { createPortal } from "react-dom";
import api from "../api";
import {
  COMMON_MANUFACTURERS,
  EMPTY_VEHICLE,
  FUEL_TYPES,
  NUMBER_FIELDS,
  NUMBER_INPUT_PROPS,
  VEHICLE_LABELS,
  VEHICLE_LIMITS,
  VEHICLE_TYPES,
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
  checkVehicleTypeFields,
  getMileageWarning,
} from "../validation";

const SELECT_OPTIONS = {
  vehicleType: VEHICLE_TYPES,
  fuelType: FUEL_TYPES,
};

// Suggestions only; any other value is allowed too.
const SUGGESTIONS = {
  manufacturer: COMMON_MANUFACTURERS,
};

// Format examples; other fields show "Enter <label>".
const PLACEHOLDERS = {
  registrationNumber: "e.g. LEA-1234 or ICT-AB-123",
  manufacturer: "e.g. Honda",
};

function toFormValues(vehicle) {
  if (!vehicle) return EMPTY_VEHICLE;

  return {
    vehicleName: vehicle.vehicleName || "",
    registrationNumber: vehicle.registrationNumber || "",
    // Older vehicles have no type; the user must pick one.
    vehicleType: vehicle.vehicleType || "",
    manufacturer: vehicle.manufacturer || "",
    modelYear: vehicle.modelYear ?? "",
    fuelType: vehicle.fuelType || EMPTY_VEHICLE.fuelType,
    engineCC: vehicle.engineCC ?? "",
    fuelEfficiency: vehicle.fuelEfficiency ?? "",
    fuelTankCapacity: vehicle.fuelTankCapacity ?? "",
  };
}

// Same rules as the server. The type's limit comes first: it is the exact range (car tank 25–80 L).
function validateVehicle(values) {
  const typeErrors = checkVehicleTypeFields(values);

  return {
    vehicleName: checkVehicleName(values.vehicleName),
    registrationNumber: checkRegistrationNumber(values.registrationNumber),
    vehicleType: typeErrors.vehicleType,
    manufacturer: checkManufacturer(values.manufacturer),
    modelYear: checkModelYear(values.modelYear),
    fuelType: checkFuelType(values.fuelType),
    engineCC: typeErrors.engineCC,
    fuelEfficiency: typeErrors.fuelEfficiency || checkFuelEfficiency(values.fuelEfficiency),
    fuelTankCapacity: typeErrors.fuelTankCapacity || checkFuelTankCapacity(values.fuelTankCapacity),
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
    validateField,
    handleSubmit: submit,
  } = useForm({
    initialValues: toFormValues(vehicle),
    validate: validateVehicle,
    onSubmit: async (values) => {
      const isElectric = values.fuelType === "Electric";
      const payload = {
        ...values,
        modelYear: Number(values.modelYear),
        // Electric vehicles have no engine size.
        engineCC: isElectric ? null : Number(values.engineCC),
        fuelEfficiency: Number(values.fuelEfficiency),
        fuelTankCapacity: Number(values.fuelTankCapacity),
      };

      const { data } = isEdit
        ? await api.put(`/vehicles/${vehicle._id}`, payload)
        : await api.post("/vehicles", payload);

      onSave(data.vehicle);
    },
    errorMessage: "Could not save vehicle",
  });

  const isElectric = form.fuelType === "Electric";
  // Only a warning under fuel efficiency; never blocks saving.
  const mileageWarning = getMileageWarning(form);

  const renderField = (key) => {
    const value = form[key];
    const isDisabled = key === "engineCC" && isElectric;
    const fieldError = fieldErrors[key];

    if (SELECT_OPTIONS[key]) {
      return (
        <div className="field" key={key}>
          <label htmlFor={`vehicle-${key}`}>{VEHICLE_LABELS[key]}</label>

          <select
            id={`vehicle-${key}`}
            value={value}
            className={fieldError ? "invalid" : ""}
            onChange={(e) => updateField(key, e.target.value)}
          >
            {key === "vehicleType" && (
              <option value="" disabled>
                Select vehicle type
              </option>
            )}
            {SELECT_OPTIONS[key].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {fieldError && <span className="field-error">{fieldError}</span>}
        </div>
      );
    }

    const suggestionsId = SUGGESTIONS[key] && `vehicle-${key}-suggestions`;
    const inputProps = NUMBER_FIELDS.includes(key)
      ? NUMBER_INPUT_PROPS
      : { type: "text", maxLength: VEHICLE_LIMITS[key]?.max, list: suggestionsId };

    return (
      <div className="field" key={key}>
        <label htmlFor={`vehicle-${key}`}>{VEHICLE_LABELS[key]}</label>

        <input
          id={`vehicle-${key}`}
          {...inputProps}
          placeholder={
            isDisabled
              ? "Not needed for electric"
              : PLACEHOLDERS[key] || `Enter ${VEHICLE_LABELS[key].toLowerCase()}`
          }
          value={isDisabled ? "" : value}
          disabled={isDisabled}
          className={fieldError ? "invalid" : ""}
          onChange={(e) => updateField(key, e.target.value)}
          onBlur={() => validateField(key)}
        />

        {suggestionsId && (
          <datalist id={suggestionsId}>
            {SUGGESTIONS[key].map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}

        {fieldError && <span className="field-error">{fieldError}</span>}

        {key === "fuelEfficiency" && !fieldError && mileageWarning && (
          <span className="field-warning">{mileageWarning}</span>
        )}
      </div>
    );
  };

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
          {Object.keys(form).map(renderField)}
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
