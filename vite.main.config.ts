import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
	build: { 
    outDir: ".vite/build", 
    lib: { 
      entry: "electron/main.ts", 
      fileName: "main",
      formats: ["es"],
    },
  },
});
