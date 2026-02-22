import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/gigachat-auth': {
            target: 'https://ngw.devices.sberbank.ru:9443',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/gigachat-auth/, ''),
          },
          '/gigachat-api': {
            target: 'https://gigachat.devices.sberbank.ru',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/gigachat-api/, ''),
          },
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
