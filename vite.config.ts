import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tanstackRouter()],
  define: {
    process: {
      env: {}
    }
  },
  resolve: {
    alias: {
      'socket-rpc': path.resolve(__dirname, './common/socket-rpc'),
      '@root': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/trpc': 'http://localhost:3001/',
      '/api': 'http://localhost:8000/'
    }
  }
})
