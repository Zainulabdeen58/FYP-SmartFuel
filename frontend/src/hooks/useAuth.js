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

  // The stored user can be out of date: an admin may have changed this
  // account's role or details. Re-read it from the server when the app opens
  // and whenever the user comes back to the tab.
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const { data } = await api.get("/users/profile");
      // Ignore the answer if the user signed out or switched account meanwhile.
      if (localStorage.getItem("token") === token) updateUser(data.user);
    } catch {
      // 401 already ended the session (see above); on a network error keep
      // the stored user and try again on the next focus.
    }
  }, [updateUser]);

  const signedIn = Boolean(user);

  useEffect(() => {
    if (!signedIn) return;

    refreshUser();
    window.addEventListener("focus", refreshUser);
    return () => window.removeEventListener("focus", refreshUser);
  }, [signedIn, refreshUser]);

  // Sign out straight away; the server call (a no-op) must not keep the user
  // waiting if the server is slow or down.
  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    endSession();
  };

  return { user, save, updateUser, refreshUser, logout };
}

export default useAuth;
