import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({ fastRefresh: false })],
  server: {
    proxy: {
      "/socket.io": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
