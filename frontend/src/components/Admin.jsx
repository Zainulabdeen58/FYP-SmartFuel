import { useEffect, useState } from "react";
import api from "../api";
import Icon from "./Icon";
import VehicleForm from "./VehicleForm";
import UserForm from "./UserForm";

function Admin({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [search, setSearch] = useState({
    user: "",
    registrationNumber: "",
  });
  const [userSearch, setUserSearch] = useState("");

  const [tab, setTab] = useState("users");
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const currentUserId = currentUser?.id || currentUser?._id;

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.contactNumber?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load users");
    }
  };

  const loadVehicles = async (params = search) => {
    try {
      const { data } = await api.get("/admin/vehicles", {
        params,
      });

      setVehicles(data.vehicles);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load vehicles");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadVehicles(search);
    }, 250);

    return () => clearTimeout(timer);
  }, [search.user, search.registrationNumber]);

  const openUserDetails = async (id) => {
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setEditingUser(data.user);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load user details");
    }
  };

  const deleteUser = async (id) => {
    if (String(id) === String(currentUserId)) {
      setError("You cannot delete your own account");
      return;
    }

    if (confirm("Delete this user and their vehicles?")) {
      try {
        await api.delete(`/admin/users/${id}`);

        loadUsers();
        loadVehicles();
      } catch (err) {
        setError(err.response?.data?.message || "Could not delete user");
      }
    }
  };

  const deleteVehicle = async (id) => {
    if (!confirm("Delete this vehicle?")) return;

    try {
      await api.delete(`/vehicles/${id}`);
      loadVehicles();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete vehicle");
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>

          <h1>Management</h1>

          <p>Manage users and vehicle records across the workspace.</p>
        </div>
      </div>

      {error && <div className="form-error page-error">{error}</div>}

      <div className="admin-stats">
        <div>
          <span>USERS</span>
          <strong>{users.length}</strong>
        </div>

        <div>
          <span>VEHICLES</span>
          <strong>{vehicles.length}</strong>
        </div>

        <div>
          <span>STATUS</span>
          <strong className="online-text">Operational</strong>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={tab === "users" ? "active" : ""}
          onClick={() => setTab("users")}
        >
          <Icon name="user" size={17} />
          Users
        </button>

        <button
          className={tab === "vehicles" ? "active" : ""}
          onClick={() => setTab("vehicles")}
        >
          <Icon name="car" size={17} />
          Vehicles
        </button>
      </div>

      {editingUser && (
        <UserForm
          user={editingUser}
          lockRole={String(editingUser._id) === String(currentUserId)}
          onSave={() => {
            setEditingUser(null);
            loadUsers();
          }}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {editingVehicle && (
        <VehicleForm
          vehicle={editingVehicle}
          onSave={() => {
            setEditingVehicle(null);
            loadVehicles();
          }}
          onCancel={() => setEditingVehicle(null)}
        />
      )}

      {tab === "users" ? (
        <div>
          <div className="admin-search admin-search-single">
            <div className="search-input">
              <Icon name="search" size={18} />

              <input
                placeholder="Search by name, email, contact or role"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-list">
            {filteredUsers.map((u) => (
              <div className="admin-row" key={u._id}>
                <div className="admin-person">
                  <div className="table-avatar">
                    {u.fullName?.charAt(0)?.toUpperCase()}
                  </div>

                  <div>
                    <strong>{u.fullName}</strong>
                    <span>{u.email}</span>
                  </div>
                </div>

                <div className="admin-contact">{u.contactNumber}</div>

                <span className="role-badge">{u.role}</span>

                <div className="row-actions">
                  <button
                    className="edit-button"
                    onClick={() => openUserDetails(u._id)}
                  >
                    <Icon name="edit" size={16} />
                    Edit
                  </button>

                  {String(u._id) === String(currentUserId) ? (
                    <span className="you-badge">You</span>
                  ) : (
                    <button
                      className="delete-button"
                      onClick={() => deleteUser(u._id)}
                    >
                      <Icon name="trash" size={16} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!filteredUsers.length && (
              <div className="empty-state">
                <h3>No users found</h3>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="admin-search">
            <div className="search-input">
              <Icon name="search" size={18} />

              <input
                placeholder="Search by user name or email"
                value={search.user}
                onChange={(e) =>
                  setSearch({
                    ...search,
                    user: e.target.value,
                  })
                }
              />
            </div>

            <div className="search-input">
              <Icon name="car" size={18} />

              <input
                placeholder="Registration number"
                value={search.registrationNumber}
                onChange={(e) =>
                  setSearch({
                    ...search,
                    registrationNumber: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="admin-list">
            {vehicles.map((v) => (
              <div className="admin-row vehicle-admin-row" key={v._id}>
                <div className="admin-person">
                  <div className="table-avatar car-avatar">
                    <Icon name="car" size={19} />
                  </div>

                  <div>
                    <strong>{v.vehicleName}</strong>

                    <span>{v.registrationNumber}</span>
                  </div>
                </div>

                <div className="admin-contact">
                  {v.manufacturer} · {v.modelYear}
                  {v.user?.fullName ? ` · ${v.user.fullName}` : ""}
                </div>

                <span className="role-badge">{v.fuelType}</span>

                <div className="row-actions">
                  <button
                    className="edit-button"
                    onClick={() => setEditingVehicle(v)}
                  >
                    <Icon name="edit" size={16} />
                    Edit
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => deleteVehicle(v._id)}
                  >
                    <Icon name="trash" size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {!vehicles.length && (
              <div className="empty-state">
                <h3>No vehicles found</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default Admin;
