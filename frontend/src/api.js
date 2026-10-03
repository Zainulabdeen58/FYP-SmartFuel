import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

// Login and register answer 401 for wrong credentials; that is not an expired session.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register"];

let handleUnauthorized = null;

// useAuth registers a handler here so an expired or rejected token signs the
// user out instead of leaving the app on a session the server no longer accepts.
export function setUnauthorizedHandler(handler) {
  handleUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => url.startsWith(path));

    if (error.response?.status === 401 && !isAuthEndpoint) {
      handleUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default api;
