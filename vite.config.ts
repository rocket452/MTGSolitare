import { defineConfig } from "vite";
import type { ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

const archidektProxy: Record<string, string | ProxyOptions> = {
  "/archidekt-api": {
    target: "https://archidekt.com",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/archidekt-api/, "/api"),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: archidektProxy,
  },
  preview: {
    proxy: archidektProxy,
  },
});
