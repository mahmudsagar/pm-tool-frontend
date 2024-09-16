import { defineConfig } from "vite";

import react from "@vitejs/plugin-react-swc";
import alias from "@rollup/plugin-alias";

import { fileURLToPath, URL } from "url";
import { univerPlugin } from "@univerjs/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    alias({
      entries: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
        // Add more aliases as needed
      ],
    }),
    univerPlugin(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Add more aliases as needed
    },
  },
});
