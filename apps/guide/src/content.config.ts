import { defineCollection } from 'astro:content';
import { i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
  // The guide's sources stay in docs/guide/ (readable on GitHub, captures in docs/guide/images/).
  docs: defineCollection({
    loader: glob({ base: '../../docs/guide', pattern: '**/[^_]*.md' }),
    schema: docsSchema(),
  }),
  // French strings of the search (Pagefind), missing from Starlight's defaults.
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
