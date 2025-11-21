import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [...mochaPlugins(process.env as any), react(), cloudflare()],
  server: {
    allowedHosts: true,
    port: 5173,
    proxy: {
      // API routes - proxy all /api calls to backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Direct proxies for specific endpoints
      '/qr': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/whatsapp': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/templates': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/triggers': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/flows': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/contacts': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/messages': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/system': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'query-vendor': ['@tanstack/react-query'],
          'socket-vendor': ['socket.io-client'],
          'ui-vendor': ['lucide-react', 'zustand']
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
