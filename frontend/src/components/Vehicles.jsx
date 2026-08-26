import { useEffect, useState } from "react";
import api from "../api";
import Icon from "./Icon";
import VehicleForm from "./VehicleForm";

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/vehicles");
      setVehicles(data.vehicles);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load vehicles");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm("Delete this vehicle?")) return;

    try {
      await api.delete(`/vehicles/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete vehicle");
    }
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditingVehicle(null);
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">RESOURCE LIBRARY</span>
          <h1>Vehicles</h1>

          <p>Manage your registered vehicles and their fuel information.</p>
        </div>

        <button
          className="submit-button small"
          onClick={() => {
            setEditingVehicle(null);
            setShowCreate(true);
          }}
        >
          <Icon name="plus" size={18} />
          Add vehicle
        </button>
      </div>

      {error && <div className="form-error page-error">{error}</div>}

      <div className="vehicle-summary">
        <div>
          <span>Total vehicles</span>
          <strong>{vehicles.length}</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Fuel types</span>
          <strong>
            {new Set(vehicles.map((vehicle) => vehicle.fuelType)).size}
          </strong>
        </div>

        <div className="summary-divider" />

        <div className="summary-note">
          <span className="status-dot" />
          Records synced
        </div>
      </div>

      {(showCreate || editingVehicle) && (
        <VehicleForm
          key={editingVehicle?._id || "create"}
          vehicle={editingVehicle}
          onSave={() => {
            closeForm();
            load();
          }}
          onCancel={closeForm}
        />
      )}

      <div className="vehicle-list">
        {vehicles.map((v) => (
          <div className="vehicle-row" key={v._id}>
            <div className="vehicle-main">
              <div className="vehicle-avatar">
                <Icon name="car" size={22} />
              </div>

              <div className="vehicle-info">
                <div className="vehicle-title">
                  <h3>{v.vehicleName}</h3>

                  <span className="vehicle-badge">{v.fuelType}</span>
                </div>

                <div className="vehicle-meta">
                  <span>{v.registrationNumber}</span>

                  <span className="meta-separator">•</span>

                  <span>{v.manufacturer}</span>

                  <span className="meta-separator">•</span>

                  <span>{v.modelYear}</span>
                </div>

                <div className="vehicle-details">
                  <span>
                    Efficiency: <strong>{v.fuelEfficiency} km/l</strong>
                  </span>

                  <span>
                    Tank: <strong>{v.fuelTankCapacity}</strong>
                  </span>

                  {v.user && (
                    <span>
                      Owner: <strong>{v.user.fullName}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="row-actions">
              <button
                className="edit-button"
                onClick={() => {
                  setShowCreate(false);
                  setEditingVehicle(v);
                }}
                title="Edit vehicle"
              >
                <Icon name="edit" size={17} />
                Edit
              </button>

              <button
                className="delete-button"
                onClick={() => remove(v._id)}
                title="Delete vehicle"
              >
                <Icon name="trash" size={17} />
                Delete
              </button>
            </div>
          </div>
        ))}

        {!vehicles.length && (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="car" size={28} />
            </div>

            <h3>No vehicles yet</h3>

            <p>Add your first vehicle to start managing your fleet.</p>

            <button
              className="submit-button small"
              onClick={() => setShowCreate(true)}
            >
              <Icon name="plus" size={17} />
              Add first vehicle
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Vehicles;
