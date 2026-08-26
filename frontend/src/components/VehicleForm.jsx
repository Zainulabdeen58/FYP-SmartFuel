import { useState } from "react";
import api from "../api";
import Icon from "./Icon";
import {
  hasErrors,
  validateFuelType,
  validateModelYear,
  validatePositiveNumber,
  validateRequired,
} from "../validation";

const emptyVehicle = {
  vehicleName: "",
  registrationNumber: "",
  manufacturer: "",
  modelYear: "",
  fuelType: "Petrol",
  fuelEfficiency: "",
  fuelTankCapacity: "",
};

function toFormValues(vehicle) {
  if (!vehicle) return emptyVehicle;

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
  const [form, setForm] = useState(() => toFormValues(vehicle));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const labels = {
    vehicleName: "Vehicle name",
    registrationNumber: "Registration number",
    manufacturer: "Manufacturer",
    modelYear: "Model year",
    fuelType: "Fuel type",
    fuelEfficiency: "Fuel efficiency",
    fuelTankCapacity: "Fuel tank capacity",
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {
      vehicleName: validateRequired(form.vehicleName, labels.vehicleName),
      registrationNumber: validateRequired(
        form.registrationNumber,
        labels.registrationNumber,
      ),
      manufacturer: validateRequired(form.manufacturer, labels.manufacturer),
      modelYear: validateModelYear(form.modelYear),
      fuelType: validateFuelType(form.fuelType),
      fuelEfficiency: validatePositiveNumber(
        form.fuelEfficiency,
        labels.fuelEfficiency,
      ),
      fuelTankCapacity: validatePositiveNumber(
        form.fuelTankCapacity,
        labels.fuelTankCapacity,
      ),
    };

    setFieldErrors(errors);
    return !hasErrors(errors);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        ...form,
        modelYear: Number(form.modelYear),
        fuelEfficiency: Number(form.fuelEfficiency),
        fuelTankCapacity: Number(form.fuelTankCapacity),
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
      };

      const { data } = isEdit
        ? await api.put(`/vehicles/${vehicle._id}`, payload)
        : await api.post("/vehicles", payload);

      onSave(data.vehicle);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
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
                <label>{labels[key]}</label>

                <select
                  value={value}
                  className={fieldErrors[key] ? "invalid" : ""}
                  onChange={(e) => updateField(key, e.target.value)}
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                </select>

                {fieldErrors[key] && (
                  <span className="field-error">{fieldErrors[key]}</span>
                )}
              </div>
            ) : (
              <div className="field" key={key}>
                <label>{labels[key]}</label>

                <input
                  type={
                    [
                      "modelYear",
                      "fuelEfficiency",
                      "fuelTankCapacity",
                    ].includes(key)
                      ? "number"
                      : "text"
                  }
                  placeholder={`Enter ${labels[key].toLowerCase()}`}
                  value={value}
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
    </div>
  );
}

export default VehicleForm;
