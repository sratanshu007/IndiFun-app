import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = process.env.API_URL || 'http://localhost:4000';
// Served by the backend at /admin in production.
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': target, '/uploads': target, '/anims': target } },
});
