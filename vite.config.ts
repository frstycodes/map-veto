import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  define: {
    process: {
      env: {}
    }
  },
  resolve: {
    alias: {
      '@root': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/trpc': 'http://localhost:3001/'
    }
  }
})
