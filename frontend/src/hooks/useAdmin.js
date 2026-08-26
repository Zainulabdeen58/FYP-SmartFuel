import { useEffect, useMemo, useState } from "react";
import api from "../api";

// Owns all the admin data: loading users/vehicles, searching, and the
// user/vehicle CRUD actions. The component only deals with rendering.
function useAdmin(currentUser) {
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [search, setSearch] = useState({
    user: "",
    registrationNumber: "",
  });
  const [userSearch, setUserSearch] = useState("");

  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const currentUserId = currentUser?.id || currentUser?._id;

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.contactNumber?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

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
      const { data } = await api.get("/admin/vehicles", { params });
      setVehicles(data.vehicles);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load vehicles");
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadVehicles(search);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (!confirm("Delete this user and their vehicles?")) return;

    try {
      await api.delete(`/admin/users/${id}`);
      loadUsers();
      loadVehicles();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete user");
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

  return {
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
  };
}

export default useAdmin;
