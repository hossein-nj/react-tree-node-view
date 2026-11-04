import { defineConfig } from "vite";

export default defineConfig({
  build: {
    cssCodeSplit: false,
    lib: {
      entry: "index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => format === "es" ? "react-tree-node-view.js" : "react-tree-node-view.cjs",
      cssFileName: "styles",
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react/jsx-dev-runtime"],
      output: {
        banner: "'use client';",
        exports: "named",
      },
    },
  },
});
