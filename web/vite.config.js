import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs (e.g. 192.168.0.221)
    port: 5173,
    proxy: {
      '/api/discord': {
        target: 'https://discord.com/api/v10',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/discord/, ''),
      },
    },
  },
})
