import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { sarvamProxyPlugin } from './server/sarvamProxy';

export default defineConfig({
  plugins: [react(), sarvamProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
