/* eslint-env node */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 3000, // We can specify a port for the dev server
      open: true, // Automatically open the app in the browser on server start
      proxy: {
        // Proxy API requests to the Flask backend during development
        "/api": {
          target: env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:5001",
          changeOrigin: true,
        },
      },
    },
    define: {
      "process.env": process.env,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
