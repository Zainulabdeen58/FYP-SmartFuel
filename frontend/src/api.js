import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

// A 401 from login or register means wrong credentials, not an expired session.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register"];

let handleUnauthorized = null;

// Set by useAuth, so any other 401 (expired or rejected token) signs the user out.
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
