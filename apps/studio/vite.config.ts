import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { aiConfigFromEnv } from './dev-server/ai/service.ts';
import { createApi } from './dev-server/api.ts';

const repo = resolve(import.meta.dirname, '../..');
// Server-side secrets (AI keys) from <repo>/.env, never exposed to the client bundle (no VITE_ prefix).
if (existsSync(resolve(repo, '.env'))) process.loadEnvFile(resolve(repo, '.env'));

/** Development persistence adapter (ADR-0004), mounted on the dev and preview servers. */
function devApi(): Plugin {
  const api = createApi({
    dataDir: resolve(repo, 'data'),
    mediaDirs: [resolve(repo, 'fixtures/media')],
    templatesDir: resolve(repo, 'templates'),
    ai: aiConfigFromEnv(process.env, resolve(repo, 'data/ai-log.jsonl')),
    exportsDir: resolve(repo, 'exports'),
    fontsDir: resolve(repo, 'fonts'),
  });
  return {
    name: 'ns-dev-api',
    configureServer: (server) => void server.middlewares.use(api),
    configurePreviewServer: (server) => void server.middlewares.use(api),
  };
}

export default defineConfig({
  plugins: [devApi()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // User guide (apps/guide, Starlight): served by `npm run dev -w @ns/guide` during development.
    proxy: { '/guide': 'http://127.0.0.1:4321' },
  },
  preview: { host: '127.0.0.1' },
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        canvas: resolve(import.meta.dirname, 'canvas.html'),
        preview: resolve(import.meta.dirname, 'preview.html'),
      },
    },
  },
});
