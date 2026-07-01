import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { fileURLToPath } from "node:url";

// Caminhos absolutos relativos a este ficheiro — independentes do cwd com que
// o Vite é arrancado (o painel de preview corre-o a partir da raiz do workspace).
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": r("./src"),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: r("./tailwind.config.js") }), autoprefixer()],
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
