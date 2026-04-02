import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { proxyPlugin } from "./server/proxy-plugin";

export default defineConfig(({ command }) => ({
  base: process.env.GITHUB_PAGES === "true" ? "/llmapi-api-tester/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    ...(command === "serve" ? [proxyPlugin()] : []),
  ],
}));
