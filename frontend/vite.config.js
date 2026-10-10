import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The dev server only serves files inside frontend/ by default; also allow
    // ../shared (rules and constants used by both frontend and backend).
    fs: { allow: [".", "../shared"] }
  }
});
