import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Proxy API calls to the HTTP gateway so HTTPS pages avoid mixed-content errors.
    // The frontend should use /gateway/ as the API base URL in dev mode.
    proxy: {
      '/gateway': {
        target: 'http://192.168.0.242',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gateway/, ''),
      },
    },
  },
})
