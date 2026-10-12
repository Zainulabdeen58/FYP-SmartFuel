import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import Layout from "./components/Layout";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import Vehicles from "./components/Vehicles";
import FuelRecords from "./components/FuelRecords";
import Profile from "./components/Profile";
import Admin from "./components/Admin";
import "./global.css";

// Lazy-loaded: Reports pulls in the large Recharts library and Trips the Leaflet map,
// so they are downloaded only when opened.
const Reports = lazy(() => import("./components/Reports"));
const Trips = lazy(() => import("./components/Trips"));

export default function App() {
  const { user, save, updateUser, refreshUser, logout } = useAuth();
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

            <Route path="/fuel-records" element={<FuelRecords user={user} />} />

            <Route
              path="/trips"
              element={
                <Suspense fallback={<div className="empty-state"><p>Loading trips...</p></div>}>
                  <Trips user={user} />
                </Suspense>
              }
            />

            <Route
              path="/reports"
              element={
                <Suspense fallback={<div className="empty-state"><p>Loading reports...</p></div>}>
                  <Reports user={user} />
                </Suspense>
              }
            />

            <Route
              path="/profile"
              element={
                <Profile key={user.id || user._id} user={user} saveUser={updateUser} />
              }
            />

            <Route
              path="/admin"
              element={
                user.role === "Admin" ? (
                  <Admin currentUser={user} onSelfUpdated={refreshUser} />
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
