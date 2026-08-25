import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Three entry pages, each installable as its own app:
//   index.html  → customer site (smellscoffee.com)
//   staff.html  → barista order screen (SmellS Staff)
//   admin.html  → manager console (SmellS Gérant)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        staff: fileURLToPath(new URL("./staff.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
        boutique: fileURLToPath(new URL("./boutique.html", import.meta.url)),
      },
    },
  },
});
