import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// React components are rendered at build time only (no client: directive), so no JavaScript is shipped.
export default defineConfig({ integrations: [react()] });
