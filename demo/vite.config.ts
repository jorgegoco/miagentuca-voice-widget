import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// Demo app only; it imports the library from ../src so no build step is needed
export default defineConfig({
  root: "demo",
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
})
