import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import alias from "@rollup/plugin-alias";
import { fileURLToPath, URL } from "url";
import { univerPlugin } from "@univerjs/vite-plugin";

export default defineConfig({
  define: {
    "process.env.IS_PREACT": JSON.stringify("true"),
  },

  envPrefix: "BN_",

  plugins: [
    react(),
    alias({
      entries: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
      ],
    }),
    univerPlugin(),
  ],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // 🔥 Important for spa routing on Vite
  server: {
    historyApiFallback: true,
  },

  // optional but recommended for Vercel
  build: {
    outDir: "dist",
  },
});
