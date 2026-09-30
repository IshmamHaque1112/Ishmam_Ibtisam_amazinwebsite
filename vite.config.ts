import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    assetsInlineLimit: 4096, // Inline small assets as base64
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Ensure WASM files are properly named
          if (assetInfo.name === 'sql-wasm.wasm') {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
})
