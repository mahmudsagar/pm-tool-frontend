import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import alias from "@rollup/plugin-alias";
import { fileURLToPath, URL } from "url";
import { univerPlugin } from "@univerjs/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "BN_");
  const apiTarget = env.BN_BASE_URL || "http://localhost:3001";

  return {
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
    proxy: {
      // Proxy REST API calls to the backend
      '/v1': {
        target: apiTarget,
        changeOrigin: true,
      },
      // Proxy Socket.io WebSocket connections to the same backend port
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },

  // optional but recommended for Vercel
  build: {
    outDir: "dist",
  },
};
});
