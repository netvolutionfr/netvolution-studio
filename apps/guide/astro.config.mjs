// User guide (docs/guide/, Markdown) built with Starlight and served by the Studio at /guide/,
// behind the same access protection. Built into the Studio's dist by `npm run build -w @ns/studio`.
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const BASE = '/guide';

/** Links between chapters (`03-construire-une-page.md#…`, readable on GitHub) become site routes. */
function chapterLinks() {
  const walk = (node) => {
    if (node.type === 'link') {
      node.url = node.url.replace(/^([\w-]+)\.md(?=#|$)/, (_, name) =>
        name === 'index' ? `${BASE}/` : `${BASE}/${name}/`,
      );
    }
    for (const child of node.children ?? []) walk(child);
  };
  return walk;
}

export default defineConfig({
  base: BASE,
  outDir: '../studio/dist/guide',
  // A private, password-protected guide: no telemetry, no external requests.
  markdown: { remarkPlugins: [chapterLinks] },
  integrations: [
    starlight({
      title: 'Guide de Netvolution Studio',
      locales: { root: { label: 'Français', lang: 'fr' } },
      customCss: ['./src/theme.css'],
      pagination: true,
      sidebar: [
        // Starlight prefixes links with the base: /guide/../ is the Studio.
        { label: '← Retour au Studio', link: '../' },
        { label: 'Sommaire', slug: 'index' },
        { label: 'Pour commencer', items: ['00-bienvenue', '01-prise-en-main', '02-interface'] },
        {
          label: 'Créer un site',
          items: [
            '03-construire-une-page',
            '04-mise-en-forme-et-responsive',
            '05-design-system',
            '06-le-site',
            '07-les-medias',
          ],
        },
        { label: 'Aller plus loin', items: ['08-reutiliser', '09-animations', '10-assistant-ia'] },
        { label: 'Publier', items: ['11-publier-et-livrer'] },
        {
          label: 'Annexes',
          items: [
            'annexe-a-correspondances',
            'annexe-b-limites',
            'annexe-c-bonnes-pratiques',
            'annexe-d-depannage',
          ],
        },
      ],
    }),
  ],
});
