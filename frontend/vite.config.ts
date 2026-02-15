import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  return {
    base: mode === "production" ? "/EnergyPlatform/" : "/",
    plugins: [react()],
    build: {
      outDir: "dist", // changed from ../static/dist to standard dist for GH Pages
      emptyOutDir: true,
    },
    server: {
        host: true, // Listen on all addresses
        proxy: {
        "/api": "http://localhost:5000",
        "/map": "http://localhost:5000",
        "/charts": "http://localhost:5000",
        },
    },
  };
});
