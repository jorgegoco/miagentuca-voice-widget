import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"

// Library build: ESM bundle + type declarations + one CSS file.
// React and the Vocal Bridge packages stay external so the host app dedupes them.
export default defineConfig({
  plugins: [react(), dts({ tsconfigPath: "./tsconfig.build.json", entryRoot: "src" })],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "style",
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^@vocalbridgeai\//],
    },
  },
})
