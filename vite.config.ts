import { createReadStream, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Dev only: serve preprocess/out at /data so the app reads local Zarr from the same origin (no CORS).
const OUT = resolve(import.meta.dirname, "preprocess/out");
const localData: Plugin = {
  name: "local-data",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/data", (req, res) => {
      const file = resolve(OUT, "." + decodeURIComponent((req.url ?? "/").split("?")[0]));
      const isFile = file.startsWith(OUT + sep) && statSync(file, { throwIfNoEntry: false })?.isFile();
      if (!isFile) {
        res.statusCode = 404; // zarrita treats a missing chunk as fill
        res.end();
        return;
      }
      if (file.endsWith(".json")) res.setHeader("Content-Type", "application/json");
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), localData],
});
