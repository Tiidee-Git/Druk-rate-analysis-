import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/Druk-rate-analysis-/' : '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
}));
