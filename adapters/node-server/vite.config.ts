import { nodeServerAdapter } from "@builder.io/qwik-city/adapters/node-server/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["src/entry.node-server.tsx", "@qwik-city-plan"],
      },
    },
    plugins: [
      nodeServerAdapter({
        name: "node-server",
        // SSR-only deploy: skip SSG worker_threads (flaky heap crash on Windows during `qwik build`).
        ssg: null,
      }),
    ],
  };
});
