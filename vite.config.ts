import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Published on GitHub Pages at https://wailregg.github.io/digistore-abonnements/
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/digistore-abonnements/" : "/",
  plugins: [react()],
  server: { port: 5190, strictPort: true },
}));
