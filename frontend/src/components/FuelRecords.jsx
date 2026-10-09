import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import useFetch from "../hooks/useFetch";
import FuelRecordForm from "./FuelRecordForm";
import Icon from "./Icon";

// Dates are stored as UTC midnight of the chosen day, so format them in UTC.
const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatNumber = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

function FuelRecords() {
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const {
    data: vehicles,
    error: vehiclesError,
    loading: vehiclesLoading,
  } = useFetch(
    async () => {
      const { data } = await api.get("/vehicles");
      return data.vehicles;
    },
    [],
    { initialData: [] },
  );

  const {
    data: records,
    error,
    setError,
    loading,
    reload: load,
  } = useFetch(
    async () => {
      const { data } = await api.get("/fuel-records", {
        params: vehicleFilter ? { vehicle: vehicleFilter } : {},
      });
      return data.records;
    },
    [vehicleFilter],
    { initialData: [] },
  );

  const fuelVehicles = vehicles.filter((v) => v.fuelType !== "Electric");
  const totalLitres = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);

  const remove = async (id) => {
    if (!confirm("Delete this fuel entry?")) return;

    try {
      await api.delete(`/fuel-records/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete fuel entry");
    }
  };

  const openCreate = () => {
    setEditingRecord(null);
    setShowCreate(true);
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditingRecord(null);
  };

  const pageError = error || vehiclesError;

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">FUEL LOG</span>
          <h1>Fuel Records</h1>

          <p>Record every fuel purchase: vehicle, date, litres and cost.</p>
        </div>

        <button
          className="submit-button small"
          onClick={openCreate}
          disabled={!fuelVehicles.length}
          title={fuelVehicles.length ? "" : "Add a petrol or diesel vehicle first"}
        >
          <Icon name="plus" size={18} />
          Add fuel entry
        </button>
      </div>

      {pageError && <div className="form-error page-error">{pageError}</div>}

      <div className="vehicle-summary">
        <div>
          <span>Entries</span>
          <strong>{records.length}</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Total litres</span>
          <strong>{formatNumber(totalLitres)} L</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Total spent</span>
          <strong>Rs {formatNumber(totalCost)}</strong>
        </div>

        <div className="summary-divider" />

        <div>
          <span>Average price</span>
          <strong>
            {totalLitres > 0 ? `Rs ${formatNumber(totalCost / totalLitres)}/L` : "—"}
          </strong>
        </div>
      </div>

      {vehicles.length > 0 && (
        <div className="field records-filter">
          <label htmlFor="fuel-filter">Show records for</label>

          <select
            id="fuel-filter"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          >
            <option value="">All vehicles</option>
            {fuelVehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.vehicleName} ({v.registrationNumber})
              </option>
            ))}
          </select>
        </div>
      )}

      {(showCreate || editingRecord) && (
        <FuelRecordForm
          key={editingRecord?._id || "create"}
          record={editingRecord}
          vehicles={vehicles}
          defaultVehicle={vehicleFilter}
          onSave={() => {
            closeForm();
            load();
          }}
          onCancel={closeForm}
        />
      )}

      <div className="vehicle-list">
        {records.map((r) => (
          <div className="vehicle-row" key={r._id}>
            <div className="vehicle-main">
              <div className="vehicle-avatar">
                <Icon name="fuel" size={22} />
              </div>

              <div className="vehicle-info">
                <div className="vehicle-title">
                  <h3>{r.vehicle?.vehicleName || "Deleted vehicle"}</h3>

                  {r.vehicle && (
                    <span className="vehicle-badge">{r.vehicle.registrationNumber}</span>
                  )}
                </div>

                <div className="vehicle-meta">
                  <span>{formatDate(r.date)}</span>

                  {r.station && (
                    <>
                      <span className="meta-separator">•</span>
                      <span>{r.station}</span>
                    </>
                  )}
                </div>

                <div className="vehicle-details">
                  <span>
                    Quantity: <strong>{formatNumber(r.quantity)} L</strong>
                  </span>

                  <span>
                    Cost: <strong>Rs {formatNumber(r.totalCost)}</strong>
                  </span>

                  <span>
                    Price: <strong>Rs {formatNumber(r.pricePerLitre)}/L</strong>
                  </span>

                  {r.odometer !== undefined && r.odometer !== null && (
                    <span>
                      Odometer: <strong>{formatNumber(r.odometer)} km</strong>
                    </span>
                  )}

                  {r.user?.fullName && (
                    <span>
                      Owner: <strong>{r.user.fullName}</strong>
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
                  setEditingRecord(r);
                }}
                title="Edit fuel entry"
              >
                <Icon name="edit" size={17} />
                Edit
              </button>

              <button
                className="delete-button"
                onClick={() => remove(r._id)}
                title="Delete fuel entry"
              >
                <Icon name="trash" size={17} />
                Delete
              </button>
            </div>
          </div>
        ))}

        {loading && !records.length && (
          <div className="empty-state">
            <p>Loading fuel records...</p>
          </div>
        )}

        {!loading && !vehiclesLoading && !pageError && !records.length && (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="fuel" size={28} />
            </div>

            {fuelVehicles.length ? (
              <>
                <h3>{vehicleFilter ? "No entries for this vehicle" : "No fuel entries yet"}</h3>

                <p>Add your first fuel entry to start tracking spending.</p>

                <button className="submit-button small" onClick={openCreate}>
                  <Icon name="plus" size={17} />
                  Add first fuel entry
                </button>
              </>
            ) : (
              <>
                <h3>No petrol or diesel vehicle</h3>

                <p>Add a petrol or diesel vehicle first, then record its fuel purchases.</p>

                <Link className="submit-button small" to="/vehicles">
                  <Icon name="car" size={17} />
                  Go to vehicles
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default FuelRecords;
