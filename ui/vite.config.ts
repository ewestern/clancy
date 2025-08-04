import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: [
      "@ewestern/agents_core_sdk", // agents core SDK
      "@ewestern/connect_hub_sdk", // connect hub SDK (CommonJS)
    ],
  },
});
