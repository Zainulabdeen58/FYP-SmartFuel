import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import Layout from "./components/Layout";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import Vehicles from "./components/Vehicles";
import Profile from "./components/Profile";
import Admin from "./components/Admin";
import "./SmartFuel.css";

export default function App() {
  const { user, save, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(user);
  const location = useLocation();

  if (!user && !["/login", "/register"].includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {user ? (
        <Layout user={user} logout={logout}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={user} />} />

            <Route path="/vehicles" element={<Vehicles />} />

            <Route
              path="/profile"
              element={
                <Profile user={currentUser || user} saveUser={setCurrentUser} />
              }
            />

            <Route
              path="/admin"
              element={
                user.role === "Admin" ? (
                  <Admin currentUser={user} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route
            path="/login"
            element={<AuthPage key="login" mode="login" save={save} />}
          />

          <Route
            path="/register"
            element={<AuthPage key="register" mode="register" save={save} />}
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
}
