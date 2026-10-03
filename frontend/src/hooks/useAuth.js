import { useCallback, useEffect, useState } from "react";
import api, { setUnauthorizedHandler } from "../api";

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function useAuth() {
  const [user, setUser] = useState(readStoredUser);

  const save = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  // Called after a profile edit so the sidebar, dashboard and profile page all
  // show the same, current user.
  const updateUser = (nextUser) => {
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const endSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Any API call answered with 401 (expired token, deleted user) ends the session.
  useEffect(() => {
    setUnauthorizedHandler(endSession);
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}

    endSession();
  };

  return { user, save, updateUser, logout };
}

export default useAuth;
