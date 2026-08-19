import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configure Vite to run on port 3000 to match backend's CORS origin
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "localhost",
    strictPort: true,
  },
});
