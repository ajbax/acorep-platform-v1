/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // With VITE_API_URL=/api, the dev server forwards API calls to API_PROXY_TARGET (no CORS locally).
  const target = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET;
  const proxy = target
    ? { '/api': { target, changeOrigin: true, rewrite: (p: string) => p.replace(/^\/api/, '') } }
    : undefined;
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // Unit tests live in src/; e2e/ belongs to Playwright.
    test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
  };
});
