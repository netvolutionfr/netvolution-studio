// User guide (docs/guide/, Markdown) built with Starlight and served by the Studio at /guide/,
// behind the same access protection. Built into the Studio's dist by `npm run build -w @ns/studio`.
// English at the root (docs/guide/), French under /guide/fr/ (docs/guide/fr/), same file names (ADR-0024).
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const BASE = '/guide';

/** Links between chapters (`03-building-a-page.md#…`, readable on GitHub) become routes of the page's language. */
function chapterLinks() {
  return (tree, file) => {
    const prefix = /[/\\]docs[/\\]guide[/\\]fr[/\\]/.test(file.path ?? '') ? `${BASE}/fr` : BASE;
    const walk = (node) => {
      if (node.type === 'link') {
        node.url = node.url.replace(/^([\w-]+)\.md(?=#|$)/, (_, name) =>
          name === 'index' ? `${prefix}/` : `${prefix}/${name}/`,
        );
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}

/** A sidebar group label in English, with its French translation. */
const group = (en, fr, items) => ({ label: en, translations: { fr }, items });

export default defineConfig({
  base: BASE,
  outDir: '../studio/dist/guide',
  // A private, password-protected guide: no telemetry, no external requests.
  markdown: { remarkPlugins: [chapterLinks] },
  integrations: [
    starlight({
      title: { en: 'Netvolution Studio guide', fr: 'Guide de Netvolution Studio' },
      locales: { root: { label: 'English', lang: 'en' }, fr: { label: 'Français', lang: 'fr' } },
      customCss: ['./src/theme.css'],
      pagination: true,
      sidebar: [
        // Starlight prefixes links with the base and the locale: /guide/../../ and /guide/fr/../../ are the Studio.
        { label: '← Back to the Studio', translations: { fr: '← Retour au Studio' }, link: '../../' },
        { label: 'Contents', translations: { fr: 'Sommaire' }, slug: 'index' },
        group('Getting started', 'Pour commencer', ['00-welcome', '01-getting-started', '02-interface']),
        group('Building a site', 'Créer un site', [
          '03-building-a-page',
          '04-styling-and-responsive',
          '05-design-system',
          '06-the-site',
          '07-media',
        ]),
        group('Going further', 'Aller plus loin', ['08-reuse', '09-animations', '10-ai-assistant']),
        group('Publishing', 'Publier', ['11-publish-and-deliver']),
        group('Appendices', 'Annexes', [
          'appendix-a-equivalences',
          'appendix-b-limits',
          'appendix-c-good-practices',
          'appendix-d-troubleshooting',
        ]),
      ],
    }),
  ],
});
