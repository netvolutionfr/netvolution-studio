import type { NodeTemplate, SymbolCategory } from '@ns/core';

const px = (value: number) => ({ value, unit: 'px' as const });
const column: NodeTemplate = { type: 'stack', name: 'Colonne', style: { base: { gap: px(16) } } };

/**
 * Built-in section library (CS-01, ADR-0011): familiar compositions of generic components (VE-04,
 * CLAUDE §7). Inserted as an independent copy by default, or as a linked instance once added to the
 * site as a shared component.
 */
export type LibrarySection = {
  id: string;
  name: string;
  category: SymbolCategory;
  description: string;
  version: number;
  tree: NodeTemplate;
};

const heading = (text: string, level = 2, size = 32): NodeTemplate => ({
  type: 'heading',
  props: { level, text },
  style: { base: { fontSize: px(size) } },
});
const paragraph = (text: string, style?: NodeTemplate['style']): NodeTemplate => ({
  type: 'text',
  props: { content: [{ text }] },
  ...(style ? { style } : {}),
});
const grid3 = (children: NodeTemplate[]): NodeTemplate => ({
  type: 'grid',
  name: 'Grille',
  style: { base: { columns: 3, gap: px(24) }, tablet: { columns: 2 }, mobile: { columns: 1 } },
  children,
});
const block = (name: string, children: NodeTemplate[]): NodeTemplate => ({
  type: 'stack',
  name,
  style: {
    base: { gap: px(24), paddingTop: px(64), paddingBottom: px(64) },
    mobile: { paddingTop: px(40), paddingBottom: px(40) },
  },
  children,
});
const card = (children: NodeTemplate[]): NodeTemplate => ({
  type: 'stack',
  name: 'Carte',
  style: {
    base: {
      gap: px(12),
      paddingTop: px(24),
      paddingBottom: px(24),
      paddingLeft: px(24),
      paddingRight: px(24),
      backgroundColor: '#f3f4f6',
      radius: px(12),
    },
  },
  children,
});
const image = (caption?: string): NodeTemplate => ({
  type: 'image',
  props: {
    assetId: null,
    alt: '',
    decorative: false,
    fit: 'cover',
    loading: 'lazy',
    ...(caption ? { caption } : {}),
  },
});

export const sections: LibrarySection[] = [
  {
    id: 'section',
    category: 'structure',
    description: 'Bloc centré à largeur limitée, avec marges.',
    version: 1,
    name: 'Section',
    tree: {
      type: 'container',
      name: 'Section',
      props: { tag: 'section' },
      style: {
        base: {
          paddingTop: px(64),
          paddingBottom: px(64),
          paddingLeft: px(24),
          paddingRight: px(24),
          maxWidth: px(1120),
          marginLeft: 'auto',
          marginRight: 'auto',
        },
        mobile: { paddingTop: px(40), paddingBottom: px(40) },
      },
    },
  },
  {
    id: 'row-2',
    category: 'structure',
    description: 'Deux colonnes, empilées sur mobile.',
    version: 1,
    name: 'Rangée 2 colonnes',
    tree: {
      type: 'grid',
      name: 'Rangée 2 colonnes',
      style: {
        base: { columns: 2, gap: px(32), paddingTop: px(32), paddingBottom: px(32) },
        mobile: { columns: 1 },
      },
      children: [column, column],
    },
  },
  {
    id: 'row-3',
    category: 'structure',
    description: 'Trois colonnes : deux sur tablette, une sur mobile.',
    version: 1,
    name: 'Rangée 3 colonnes',
    tree: {
      type: 'grid',
      name: 'Rangée 3 colonnes',
      style: {
        base: { columns: 3, gap: px(24), paddingTop: px(32), paddingBottom: px(32) },
        tablet: { columns: 2 },
        mobile: { columns: 1 },
      },
      children: [column, column, column],
    },
  },
  {
    id: 'hero',
    category: 'hero',
    description: 'Grand titre, texte, bouton et visuel côte à côte.',
    version: 1,
    name: 'Hero',
    tree: {
      type: 'stack',
      name: 'Hero',
      style: {
        base: { direction: 'row', align: 'center', gap: px(48), paddingTop: px(80), paddingBottom: px(80) },
        mobile: {
          direction: 'column',
          align: 'stretch',
          gap: px(24),
          paddingTop: px(40),
          paddingBottom: px(40),
        },
      },
      children: [
        {
          type: 'stack',
          name: 'Accroche',
          style: { base: { grow: 1, basis: px(0), gap: px(16) } },
          children: [
            {
              type: 'heading',
              props: { level: 1, text: 'Votre titre principal' },
              style: { base: { fontSize: px(48) } },
            },
            { type: 'text', props: { content: [{ text: 'Une phrase qui présente votre offre.' }] } },
            { type: 'button' },
          ],
        },
        { type: 'spacer', name: 'Visuel', style: { base: { grow: 1, basis: px(0), minHeight: px(240) } } },
      ],
    },
  },
  {
    id: 'logo',
    category: 'elements',
    description: 'Image du logo, à lier à la page d’accueil.',
    version: 1,
    name: 'Logo',
    tree: {
      type: 'image',
      name: 'Logo',
      props: { assetId: null, alt: '', decorative: false, fit: 'contain', loading: 'eager' },
      style: { base: { maxWidth: px(180) } },
    },
  },
  {
    id: 'card',
    category: 'features',
    description: 'Icône, titre, texte et lien.',
    version: 1,
    name: 'Carte',
    tree: {
      type: 'stack',
      name: 'Carte',
      style: {
        base: {
          gap: px(12),
          paddingTop: px(24),
          paddingBottom: px(24),
          paddingLeft: px(24),
          paddingRight: px(24),
          backgroundColor: '#f3f4f6',
          radius: px(12),
        },
      },
      children: [
        { type: 'icon', props: { name: 'sparkles', label: '' } },
        {
          type: 'heading',
          props: { level: 3, text: 'Titre de la carte' },
          style: { base: { fontSize: px(22) } },
        },
        {
          type: 'text',
          props: { content: [{ text: 'Une courte description du service ou de l’avantage.' }] },
        },
        {
          type: 'button',
          props: { label: 'En savoir plus', link: { kind: 'url', href: '#' }, variant: 'text' },
        },
      ],
    },
  },
  {
    id: 'cta',
    category: 'cta',
    description: 'Bandeau coloré : titre, texte et bouton.',
    version: 1,
    name: 'Appel à l’action',
    tree: {
      type: 'stack',
      name: 'Appel à l’action',
      style: {
        base: {
          align: 'center',
          gap: px(16),
          paddingTop: px(56),
          paddingBottom: px(56),
          paddingLeft: px(24),
          paddingRight: px(24),
          backgroundColor: '#1d4ed8',
          radius: px(16),
        },
      },
      children: [
        {
          type: 'heading',
          props: { level: 2, text: 'Prêt à démarrer ?' },
          style: { base: { fontSize: px(32), color: '#ffffff', textAlign: 'center' } },
        },
        {
          type: 'text',
          props: { content: [{ text: 'Parlons de votre projet.' }] },
          style: { base: { color: '#ffffff', textAlign: 'center' } },
        },
        {
          type: 'button',
          props: { label: 'Nous contacter', link: { kind: 'url', href: '#' }, variant: 'primary' },
          style: { base: { alignSelf: 'center' } },
        },
      ],
    },
  },
  {
    id: 'gallery',
    category: 'gallery',
    description: 'Grille responsive d’images légendées (composants Image modifiables un par un).',
    version: 1,
    name: 'Grille d’images',
    tree: {
      type: 'grid',
      name: 'Grille d’images',
      style: {
        base: { columns: 3, gap: px(16), paddingTop: px(24) },
        tablet: { columns: 2 },
        mobile: { columns: 1 },
      },
      children: [1, 2, 3].map((i) => ({
        type: 'image',
        props: {
          assetId: null,
          alt: '',
          decorative: false,
          fit: 'cover',
          loading: 'lazy',
          caption: `Légende ${i}`,
        },
      })),
    },
  },
  {
    id: 'accordion',
    category: 'elements',
    description: 'Questions-réponses dépliables, sans JavaScript.',
    version: 1,
    name: 'Accordéon (FAQ)',
    tree: {
      type: 'accordion',
      name: 'FAQ',
      children: [1, 2].map((i) => ({
        type: 'accordion-item',
        props: { title: `Question ${i}`, open: i === 1 },
        children: [{ type: 'text', props: { content: [{ text: `Réponse ${i}.` }] } }],
      })),
    },
  },
  {
    id: 'tabs',
    category: 'elements',
    description: 'Contenus en onglets accessibles au clavier.',
    version: 1,
    name: 'Bloc d’onglets',
    tree: {
      type: 'tabs',
      children: [1, 2].map((i) => ({
        type: 'tab',
        props: { title: `Onglet ${i}` },
        children: [{ type: 'text', props: { content: [{ text: `Contenu de l’onglet ${i}.` }] } }],
      })),
    },
  },
  {
    id: 'presentation',
    category: 'presentation',
    description: 'Image et texte côte à côte, empilés sur mobile.',
    version: 1,
    name: 'Présentation',
    tree: {
      type: 'grid',
      name: 'Présentation',
      style: {
        base: { columns: 2, gap: px(48), align: 'center', paddingTop: px(64), paddingBottom: px(64) },
        mobile: { columns: 1, gap: px(24), paddingTop: px(40), paddingBottom: px(40) },
      },
      children: [
        image(),
        {
          type: 'stack',
          name: 'Texte',
          style: { base: { gap: px(16) } },
          children: [
            heading('Qui sommes-nous ?'),
            paragraph('Présentez votre activité, votre histoire et ce qui vous distingue.'),
            {
              type: 'button',
              props: { label: 'En savoir plus', link: { kind: 'url', href: '#' }, variant: 'secondary' },
            },
          ],
        },
      ],
    },
  },
  {
    id: 'features',
    category: 'features',
    description: 'Titre et trois atouts avec icône.',
    version: 1,
    name: 'Atouts',
    tree: block('Atouts', [
      heading('Pourquoi nous choisir'),
      grid3(
        [
          ['zap', 'Rapide', 'Des pages légères, servies en statique.'],
          ['shield-check', 'Sûr', 'Aucune interface d’administration exposée.'],
          ['heart', 'Accessible', 'Clavier, lecteurs d’écran et contrastes soignés.'],
        ].map(([icon, title, text]) =>
          card([
            { type: 'icon', props: { name: icon, label: '' } },
            heading(title as string, 3, 22),
            paragraph(text as string),
          ]),
        ),
      ),
    ]),
  },
  {
    id: 'testimonials',
    category: 'testimonials',
    description: 'Trois citations de clients avec leur nom.',
    version: 1,
    name: 'Témoignages',
    tree: block('Témoignages', [
      heading('Ils nous font confiance'),
      grid3(
        [1, 2, 3].map((i) =>
          card([
            {
              type: 'icon',
              props: { name: 'quote', label: '' },
              style: { base: { fontSize: px(28), color: '#6b7280' } },
            },
            paragraph(`« Un témoignage de client, court et concret. »`, { base: { fontSize: px(18) } }),
            paragraph(`Prénom Nom ${i}, entreprise`, { base: { fontWeight: 600 } }),
          ]),
        ),
      ),
    ]),
  },
  {
    id: 'pricing',
    category: 'pricing',
    description: 'Trois formules avec prix, description et bouton.',
    version: 1,
    name: 'Tarifs',
    tree: block('Tarifs', [
      heading('Nos formules'),
      grid3(
        [
          ['Essentiel', '490 €'],
          ['Pro', '990 €'],
          ['Sur mesure', 'Sur devis'],
        ].map(([name, price]) =>
          card([
            heading(name as string, 3, 22),
            { type: 'heading', props: { level: 4, text: price }, style: { base: { fontSize: px(36) } } },
            paragraph('Ce que comprend la formule, en une ou deux phrases.'),
            {
              type: 'button',
              props: { label: 'Choisir', link: { kind: 'url', href: '#' }, variant: 'primary' },
            },
          ]),
        ),
      ),
    ]),
  },
  {
    id: 'team',
    category: 'team',
    description: 'Trois membres : photo, nom et rôle.',
    version: 1,
    name: 'Équipe',
    tree: block('Équipe', [
      heading('L’équipe'),
      grid3(
        [1, 2, 3].map((i) => ({
          type: 'stack',
          name: 'Membre',
          style: { base: { gap: px(8) } },
          children: [
            image(),
            heading(`Prénom Nom ${i}`, 3, 20),
            paragraph('Rôle', { base: { color: '#4b5563' } }),
          ],
        })),
      ),
    ]),
  },
  {
    id: 'contact',
    category: 'contact',
    description: 'Invitation à écrire et coordonnées avec icônes.',
    version: 1,
    name: 'Contact',
    tree: {
      type: 'grid',
      name: 'Contact',
      style: {
        base: { columns: 2, gap: px(48), paddingTop: px(64), paddingBottom: px(64) },
        mobile: { columns: 1, gap: px(24), paddingTop: px(40), paddingBottom: px(40) },
      },
      children: [
        {
          type: 'stack',
          name: 'Invitation',
          style: { base: { gap: px(16) } },
          children: [
            heading('Parlons de votre projet'),
            paragraph('Réponse sous 48 heures ouvrées.'),
            {
              type: 'button',
              props: {
                label: 'Nous écrire',
                link: { kind: 'url', href: 'mailto:contact@exemple.fr' },
                variant: 'primary',
              },
            },
          ],
        },
        {
          type: 'stack',
          name: 'Coordonnées',
          style: { base: { gap: px(12) } },
          children: [
            ['phone', '01 23 45 67 89'],
            ['mail', 'contact@exemple.fr'],
            ['map-pin', '12 rue des Arts, Lille'],
          ].map(([icon, text]) => ({
            type: 'stack',
            name: 'Ligne',
            style: { base: { direction: 'row', align: 'center', gap: px(12) } },
            children: [
              { type: 'icon', props: { name: icon, label: '' }, style: { base: { fontSize: px(20) } } },
              paragraph(text as string),
            ],
          })),
        },
      ],
    },
  },
];
