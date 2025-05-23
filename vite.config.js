import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "./frontend",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend/src"),
      "shared/": path.resolve(__dirname, "./shared/"),
    },
  },
  envDir: "../",
  plugins: [tailwindcss()],
});
