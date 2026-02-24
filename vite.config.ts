import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/gigachat-auth': {
        target: 'https://ngw.devices.sberbank.ru:9443',
        changeOrigin: true,
        secure: false,
        rewrite: (requestPath) => requestPath.replace(/^\/gigachat-auth/, ''),
      },
      '/gigachat-api': {
        target: 'https://gigachat.devices.sberbank.ru',
        changeOrigin: true,
        secure: false,
        rewrite: (requestPath) => requestPath.replace(/^\/gigachat-api/, ''),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
