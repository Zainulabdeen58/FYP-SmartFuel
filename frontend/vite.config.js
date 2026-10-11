import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Vite only serves frontend/ by default; also allow ../shared (code shared with the backend).
    fs: { allow: [".", "../shared"] }
  }
});
