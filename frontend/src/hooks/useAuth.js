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

  // After a profile edit, so the sidebar, dashboard and profile stay in step.
  const updateUser = useCallback((nextUser) => {
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

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

  // Re-read the user on app open and tab focus; an admin may have changed the role or details.
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const { data } = await api.get("/users/profile");
      // Ignore the answer if the user signed out or switched account meanwhile.
      if (localStorage.getItem("token") === token) updateUser(data.user);
    } catch {
      // A 401 already signed out; on a network error keep the stored user and retry on next focus.
    }
  }, [updateUser]);

  const signedIn = Boolean(user);

  useEffect(() => {
    if (!signedIn) return;

    refreshUser();
    window.addEventListener("focus", refreshUser);
    return () => window.removeEventListener("focus", refreshUser);
  }, [signedIn, refreshUser]);

  // Sign out at once; don't wait for the server call (a no-op).
  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    endSession();
  };

  return { user, save, updateUser, refreshUser, logout };
}

export default useAuth;
