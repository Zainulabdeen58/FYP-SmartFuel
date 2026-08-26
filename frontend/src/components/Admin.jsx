import { useState } from "react";
import useAdmin from "../hooks/useAdmin";
import Icon from "./Icon";
import VehicleForm from "./VehicleForm";
import UserForm from "./UserForm";

function Admin({ currentUser }) {
  const {
    users,
    vehicles,
    filteredUsers,
    search,
    setSearch,
    userSearch,
    setUserSearch,
    error,
    currentUserId,
    editingUser,
    setEditingUser,
    editingVehicle,
    setEditingVehicle,
    loadUsers,
    loadVehicles,
    openUserDetails,
    deleteUser,
    deleteVehicle,
  } = useAdmin(currentUser);

  const [tab, setTab] = useState("users");

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
