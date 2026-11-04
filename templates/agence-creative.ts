// Template « Studio Orbe » — creative agency: dark, bold typography, gradients, animated grids.
// Original design and copy; contact details are fictional (.example domain, ARCEP fiction number).
import {
  box,
  btn,
  center,
  h,
  icon,
  img,
  type LinkTo,
  lift,
  list,
  type Media,
  p,
  pad,
  pct,
  px,
  reveal,
  st,
  type T,
  type TemplateSpec,
  tok,
} from './kit.ts';
import { cover, orbs, portrait, wordmark } from './visuals.ts';

const C = {
  ink: '#0b0a12',
  surface: '#16141f',
  line: '#2a2638',
  text: '#f4f2fb',
  soft: '#b4b0c8',
  accent: '#8b6cff',
  coral: '#ff7a59',
};
const EMAIL: LinkTo = { url: 'mailto:bonjour@studio-orbe.example' };
const PHONE: LinkTo = { url: 'tel:+33465712026' };

// ---------- Visuals ----------
const PROJECTS = [
  {
    id: 'lune',
    name: 'Maison Lune',
    kind: 'Identité & packaging',
    from: '#2b1d5c',
    to: '#8b6cff',
    ink: '#ffd6c9',
  },
  {
    id: 'cap',
    name: 'Cap Horizon',
    kind: 'Site & plateforme',
    from: '#0f2a3d',
    to: '#2fb5c8',
    ink: '#ffffff',
  },
  {
    id: 'atelier',
    name: 'Atelier Brume',
    kind: 'Direction artistique',
    from: '#3d1f1f',
    to: '#ff7a59',
    ink: '#ffe9c2',
  },
  {
    id: 'vela',
    name: 'Vela Mobilité',
    kind: 'Motion & campagne',
    from: '#14213d',
    to: '#6c8cff',
    ink: '#d9f99d',
  },
  {
    id: 'ferme',
    name: 'La Ferme Haute',
    kind: 'Identité & site',
    from: '#1f3324',
    to: '#7bc47f',
    ink: '#fff7d6',
  },
  { id: 'nova', name: 'Nova Santé', kind: 'Design system', from: '#2a1a3a', to: '#c86cff', ink: '#e0f2fe' },
];
const CLIENTS: [string, 'circle' | 'square' | 'triangle', boolean][] = [
  ['NORDIQ', 'circle', false],
  ['Pléiade', 'triangle', true],
  ['KAPSUL', 'square', false],
  ['Ombelle', 'circle', true],
  ['VERSO', 'triangle', false],
];
const TEAM = [
  {
    id: 'claire',
    name: 'Claire Morand',
    role: 'Fondatrice, direction de création',
    bg: '#2b1d5c',
    skin: '#e8b89a',
    cloth: '#8b6cff',
    hair: '#3b2a20',
  },
  {
    id: 'yanis',
    name: 'Yanis Haddad',
    role: 'Direction artistique',
    bg: '#3d1f1f',
    skin: '#c68b62',
    cloth: '#ff7a59',
    hair: '#1a1410',
  },
  {
    id: 'lea',
    name: 'Léa Vasseur',
    role: 'Design numérique',
    bg: '#0f2a3d',
    skin: '#f1c9a8',
    cloth: '#2fb5c8',
    hair: '#a8582d',
  },
  {
    id: 'tom',
    name: 'Tom Ribeiro',
    role: 'Motion design',
    bg: '#1f3324',
    skin: '#d9a07b',
    cloth: '#7bc47f',
    hair: '#2c2018',
  },
];

const media: Media[] = [
  {
    id: 'aorbehero01',
    file: 'aorbehero01.svg',
    svg: orbs(1600, 1000, C.ink, [C.accent, C.coral, '#3b6cff'], 7),
    width: 1600,
    height: 1000,
    name: 'Fond du hero (orbes)',
    alt: '',
  },
  ...PROJECTS.map((pr, i) => ({
    id: `aorbeproj${i}0`,
    file: `aorbeproj${i}0.svg`,
    svg: cover(1200, 900, pr.from, pr.to, pr.ink, 11 + i * 7),
    width: 1200,
    height: 900,
    name: `Projet ${pr.name}`,
    alt: `${pr.name} : ${pr.kind.toLowerCase()} (visuel de démonstration)`,
  })),
  ...CLIENTS.map(([name, mark, italic], i) => ({
    id: `aorbelogo${i}0`,
    file: `aorbelogo${i}0.svg`,
    svg: wordmark(name, C.soft, mark, italic),
    width: 320,
    height: 80,
    name: `Logo ${name}`,
    alt: name,
  })),
  ...TEAM.map((m, i) => ({
    id: `aorbeteam${i}0`,
    file: `aorbeteam${i}0.svg`,
    svg: portrait(600, 600, m.bg, m.skin, m.cloth, m.hair, 3 + i),
    width: 600,
    height: 600,
    name: `Portrait ${m.name}`,
    alt: `Portrait illustré de ${m.name}`,
  })),
];

// ---------- Building blocks ----------
const eyebrow = (text: string) => p(text, st({ color: tok('accent'), fontWeight: 600, fontSize: px(15) }));
const lead = (text: string, max = 680) =>
  p(
    text,
    st({ color: tok('soft'), fontSize: px(20), lineHeight: 1.6, maxWidth: px(max) }, undefined, {
      fontSize: px(18),
    }),
  );
const inner = (children: T[], extra = {}) =>
  box(
    'stack',
    'Contenu',
    st({ direction: 'column', gap: tok('bloc'), width: pct(100), ...center(1200), ...extra }),
    children,
  );
const section = (name: string, children: T[], style: Record<string, unknown> = {}, innerStyle = {}): T =>
  box(
    'container',
    name,
    st(
      {
        paddingTop: tok('section'),
        paddingBottom: tok('section'),
        paddingLeft: px(32),
        paddingRight: px(32),
        ...style,
      },
      undefined,
      { paddingLeft: px(20), paddingRight: px(20) },
    ),
    [inner(children, innerStyle)],
  );
const grid = (
  name: string,
  cols: [number, number, number],
  gap: number,
  children: T[],
  extra: Partial<T> = {},
): T =>
  box(
    'grid',
    name,
    st({ columns: cols[0], gap: px(gap) }, { columns: cols[1] }, { columns: cols[2] }),
    children,
    extra,
  );
const row = (children: T[], gap = 16) =>
  box('stack', 'Boutons', st({ direction: 'row', wrap: true, gap: px(gap), align: 'center' }), children);
const ghost = (label: string, to: LinkTo) =>
  btn(label, to, 'secondary', st({ color: tok('text'), radius: px(999) }));
const primary = (label: string, to: LinkTo) =>
  btn(
    label,
    to,
    'primary',
    st({ backgroundColor: tok('accent'), color: tok('ink'), radius: px(999), ...pad(14, 26) }),
  );
const textLink = (label: string, to: LinkTo) => btn(label, to, 'text', st({ color: tok('text') }));
const card = (children: T[], extra = {}): T => ({
  ...box(
    'stack',
    'Carte',
    st(
      {
        direction: 'column',
        gap: px(16),
        backgroundColor: tok('surface'),
        borderWidth: px(1),
        borderStyle: 'solid',
        borderColor: tok('line'),
        radius: tok('carte'),
        ...pad(32, 32),
        ...extra,
      },
      undefined,
      pad(24, 24),
    ),
    children,
  ),
  anim: lift,
});
const pageHero = (kicker: string, title: string, text: string): T =>
  section(
    'En-tête de page',
    [
      {
        ...inner([eyebrow(kicker), h(1, title, st({ maxWidth: px(980) })), lead(text)], { gap: px(24) }),
        name: 'Accroche',
        anim: reveal(24, 120),
      },
    ],
    {
      backgroundImage: { asset: 'aorbehero01', size: 'cover', position: 'top' },
      gradient: {
        kind: 'linear',
        angle: 180,
        stops: [
          { color: '#0b0a1233', at: 0 },
          { color: '#0b0a12', at: 100 },
        ],
      },
    },
  );
const projectCard = (i: number): T => {
  const pr = PROJECTS[i] as (typeof PROJECTS)[number];
  return box('stack', `Projet ${pr.name}`, st({ direction: 'column', gap: px(16) }), [
    img(
      `aorbeproj${i}0`,
      `${pr.name} : ${pr.kind.toLowerCase()} (visuel de démonstration)`,
      st({ radius: tok('carte'), aspectRatio: '4/3', width: { value: 100, unit: '%' } }),
      { fit: 'cover' },
    ),
    box(
      'stack',
      'Légende',
      st({ direction: 'row', justify: 'space-between', align: 'baseline', wrap: true, gap: px(8) }),
      [h(3, pr.name), p(pr.kind, st({ color: tok('soft') }))],
    ),
  ]);
};
const cta: T = box(
  'container',
  'Appel à l’action',
  st({ paddingLeft: px(32), paddingRight: px(32), paddingBottom: tok('section') }, undefined, {
    paddingLeft: px(20),
    paddingRight: px(20),
  }),
  [
    {
      ...box(
        'stack',
        'Bandeau',
        st(
          {
            direction: 'column',
            align: 'start',
            gap: px(24),
            ...center(1200),
            ...pad(80, 64),
            radius: px(32),
            color: tok('ink'),
            gradient: {
              kind: 'linear',
              angle: 120,
              stops: [
                { color: '#8b6cff', at: 0 },
                { color: '#ff7a59', at: 100 },
              ],
            },
          },
          undefined,
          pad(48, 28),
        ),
        [
          h(2, 'Un projet en tête ?', st({ maxWidth: px(720) })),
          p(
            'Racontez-nous où vous en êtes : nous revenons vers vous sous 48 heures avec une première lecture et une proposition de rendez-vous.',
            st({ fontSize: px(19), maxWidth: px(640) }),
          ),
          row([
            btn(
              'Écrire au studio',
              EMAIL,
              'primary',
              st({ backgroundColor: tok('ink'), color: tok('text'), radius: px(999), ...pad(14, 26) }),
            ),
            btn('04 65 71 20 26', PHONE, 'secondary', st({ color: tok('ink'), radius: px(999) })),
          ]),
        ],
      ),
      anim: reveal(32),
    },
  ],
);
const page = (name: string, sections: T[]): T =>
  box('container', name, st({ backgroundColor: tok('ink'), color: tok('text') }), sections, {
    props: { tag: 'main' },
  });

// ---------- Pages ----------
const EXPERTISES = [
  {
    icon: 'sparkles',
    title: 'Identité de marque',
    text: 'Plateforme, nom, logo et système graphique : une marque cohérente du premier regard au dernier détail.',
  },
  {
    icon: 'globe',
    title: 'Sites & produits numériques',
    text: 'Sites vitrines, plateformes et applications pensés pour vos utilisateurs, rapides et accessibles.',
  },
  {
    icon: 'star',
    title: 'Direction artistique',
    text: 'Photographie, illustration, campagnes : une image singulière, déclinée sur tous vos supports.',
  },
  {
    icon: 'zap',
    title: 'Motion & vidéo',
    text: 'Animations de marque, vidéos courtes et interfaces vivantes, au service du message.',
  },
];

const home: T = page('Accueil', [
  section(
    'Hero',
    [
      {
        ...inner(
          [
            eyebrow('Studio de design & de marque — Lyon'),
            h(1, 'Nous dessinons des marques qui ne passent pas inaperçues.', st({ maxWidth: px(1000) })),
            lead(
              'Identités, sites et campagnes pour les entreprises qui veulent se distinguer, de la stratégie au dernier pixel.',
            ),
            row([
              primary('Voir nos projets', { page: 'projets' }),
              ghost('Parler de votre projet', { page: 'contact' }),
            ]),
          ],
          { gap: px(28) },
        ),
        name: 'Accroche',
        anim: reveal(32, 140).map((a) => ({ ...a, trigger: 'load' as const })),
      },
    ],
    {
      minHeight: px(760),
      backgroundColor: tok('ink'),
      backgroundImage: { asset: 'aorbehero01', size: 'cover', position: 'center' },
      gradient: {
        kind: 'linear',
        angle: 180,
        stops: [
          { color: '#0b0a1200', at: 50 },
          { color: '#0b0a12', at: 100 },
        ],
      },
    },
    { justify: 'center', minHeight: px(560) },
  ),
  section(
    'Références',
    [
      p('Ils nous font confiance', st({ color: tok('soft'), textAlign: 'center' })),
      grid(
        'Logos',
        [5, 3, 2],
        32,
        CLIENTS.map(([name], i) =>
          img(
            `aorbelogo${i}0`,
            name,
            st({
              width: { value: 100, unit: '%' },
              maxWidth: px(200),
              marginLeft: 'auto',
              marginRight: 'auto',
            }),
            { fit: 'contain' },
          ),
        ),
        { anim: reveal(16, 80) },
      ),
    ],
    { paddingTop: px(48), paddingBottom: px(48) },
    { gap: px(28) },
  ),
  section('Chiffres', [
    grid(
      'Chiffres clés',
      [4, 2, 2],
      32,
      [
        ['12', 'années d’indépendance'],
        ['140+', 'projets livrés'],
        ['9', 'prix de design'],
        ['48 h', 'pour une première réponse'],
      ].map(([n, label]) =>
        box('stack', 'Chiffre', st({ direction: 'column', gap: px(8) }), [
          p(
            n as string,
            st(
              {
                fontFamily: tok('titres'),
                fontSize: px(64),
                fontWeight: 700,
                lineHeight: 1,
                color: tok('accent'),
              },
              undefined,
              { fontSize: px(44) },
            ),
          ),
          p(label as string, st({ color: tok('soft') })),
        ]),
      ),
      { anim: reveal(24, 100) },
    ),
  ]),
  section('Expertises', [
    eyebrow('Expertises'),
    h(2, 'Une équipe, quatre savoir-faire complémentaires', st({ maxWidth: px(760) })),
    grid(
      'Cartes',
      [4, 2, 1],
      24,
      EXPERTISES.map((e) =>
        card([
          icon(e.icon, st({ fontSize: px(30), color: tok('accent') })),
          h(3, e.title),
          p(e.text, st({ color: tok('soft') })),
          textLink('En savoir plus →', { page: 'expertises' }),
        ]),
      ),
      { anim: reveal(24, 120) },
    ),
  ]),
  section('Projets récents', [
    box(
      'stack',
      'Titre et lien',
      st({ direction: 'row', justify: 'space-between', align: 'end', wrap: true, gap: px(16) }),
      [
        box('stack', 'Titre', st({ direction: 'column', gap: px(12) }), [
          eyebrow('Réalisations'),
          h(2, 'Projets récents'),
        ]),
        textLink('Tous les projets →', { page: 'projets' }),
      ],
    ),
    grid('Projets', [2, 2, 1], 32, [0, 1, 2, 3].map(projectCard), { anim: reveal(32, 150) }),
  ]),
  section(
    'Méthode',
    [
      eyebrow('Méthode'),
      h(2, 'Quatre temps, une seule équipe du début à la fin'),
      grid(
        'Étapes',
        [4, 2, 1],
        32,
        [
          [
            '01',
            'Comprendre',
            'Ateliers, entretiens, analyse du marché : nous partons de vos enjeux, pas de nos envies.',
          ],
          [
            '02',
            'Imaginer',
            'Pistes créatives argumentées, présentées en situation, pour décider sur pièces.',
          ],
          ['03', 'Concevoir', 'Design, rédaction, développement : chaque détail est travaillé et testé.'],
          ['04', 'Accompagner', 'Formation, déclinaisons, suivi : votre équipe reste autonome.'],
        ].map(([n, title, text]) =>
          box(
            'stack',
            'Étape',
            st({
              direction: 'column',
              gap: px(12),
              borderWidth: px(1),
              borderStyle: 'solid',
              borderColor: tok('line'),
              radius: tok('carte'),
              ...pad(28, 28),
            }),
            [
              p(
                n as string,
                st({ fontFamily: tok('titres'), fontWeight: 700, color: tok('coral'), fontSize: px(18) }),
              ),
              h(3, title as string),
              p(text as string, st({ color: tok('soft') })),
            ],
          ),
        ),
        { anim: reveal(24, 100) },
      ),
    ],
    { backgroundColor: tok('surface') },
  ),
  section(
    'Témoignage',
    [
      icon('quote', st({ fontSize: px(44), color: tok('accent') })),
      p(
        '« Orbe a su traduire vingt ans d’histoire en une marque qui nous ressemble enfin. Nos équipes se la sont appropriée dès le premier jour. »',
        st(
          { fontFamily: tok('titres'), fontSize: px(32), lineHeight: 1.3, fontWeight: 500 },
          { fontSize: px(26) },
          { fontSize: px(22) },
        ),
      ),
      box('stack', 'Auteur', st({ direction: 'row', gap: px(16), align: 'center', justify: 'center' }), [
        img('aorbeteam00', '', st({ width: px(56), height: px(56), radius: px(999) }), { fit: 'cover' }),
        p(
          [{ text: 'Hélène Garnier', bold: true }, { text: ' — directrice générale, Maison Lune' }],
          st({ color: tok('soft') }),
        ),
      ]),
    ],
    {},
    { align: 'center', textAlign: 'center', maxWidth: px(920), gap: px(32) },
  ),
  cta,
]);

const agence: T = page('L’agence', [
  pageHero(
    'L’agence',
    'Indépendants, exigeants et curieux depuis 2014.',
    'Un studio à taille humaine : huit personnes, une seule équipe, et le goût des projets qui ont du sens.',
  ),
  section('Manifeste', [
    grid('Manifeste', [2, 2, 1], 64, [
      h(2, 'Le design n’est pas une couche de vernis. C’est une décision.'),
      box('stack', 'Texte', st({ direction: 'column', gap: px(20) }), [
        p(
          'Nous croyons qu’une marque forte naît d’une conviction claire, exprimée avec justesse. Notre rôle : vous aider à la formuler, puis à la rendre visible partout où elle compte.',
          st({ color: tok('soft'), fontSize: px(18) }),
        ),
        p(
          'Nous travaillons avec peu de clients à la fois, sur la durée, en impliquant vos équipes à chaque étape. Pas de sous-traitance cachée : ceux qui vous rencontrent sont ceux qui conçoivent.',
          st({ color: tok('soft'), fontSize: px(18) }),
        ),
      ]),
    ]),
  ]),
  section('Valeurs', [
    eyebrow('Nos valeurs'),
    grid(
      'Valeurs',
      [3, 3, 1],
      24,
      [
        [
          'shield-check',
          'Exigence',
          'Chaque livrable est relu, testé et justifié. Le détail fait la différence.',
        ],
        [
          'heart',
          'Sincérité',
          'Nous disons ce que nous pensons, y compris quand ce n’est pas ce que vous attendez.',
        ],
        [
          'leaf',
          'Sobriété',
          'Des sites légers, des fichiers maîtrisés, des choix durables plutôt qu’à la mode.',
        ],
      ].map(([ic, title, text]) =>
        card([
          icon(ic as string, st({ fontSize: px(28), color: tok('coral') })),
          h(3, title as string),
          p(text as string, st({ color: tok('soft') })),
        ]),
      ),
      { anim: reveal(24, 120) },
    ),
  ]),
  section('Équipe', [
    eyebrow('L’équipe'),
    h(2, 'Les visages du studio'),
    grid(
      'Portraits',
      [4, 2, 2],
      24,
      TEAM.map((m, i) =>
        box('stack', m.name, st({ direction: 'column', gap: px(12) }), [
          img(
            `aorbeteam${i}0`,
            `Portrait illustré de ${m.name}`,
            st({ radius: tok('carte'), aspectRatio: '1/1', width: { value: 100, unit: '%' } }),
            { fit: 'cover' },
          ),
          h(3, m.name),
          p(m.role, st({ color: tok('soft') })),
        ]),
      ),
      { anim: reveal(24, 100) },
    ),
  ]),
  cta,
]);

const expertises: T = page('Expertises', [
  pageHero(
    'Expertises',
    'Ce que nous faisons, et comment.',
    'Quatre métiers réunis pour que votre marque parle d’une seule voix, du logo au site, de l’affiche à la vidéo.',
  ),
  ...EXPERTISES.map((e, i) =>
    section(
      e.title,
      [
        grid(e.title, [2, 2, 1], 64, [
          img(
            `aorbeproj${i}0`,
            '',
            st({ radius: tok('carte'), aspectRatio: '4/3', width: { value: 100, unit: '%' } }),
            { fit: 'cover' },
          ),
          box('stack', 'Description', st({ direction: 'column', gap: px(20), justify: 'center' }), [
            icon(e.icon, st({ fontSize: px(32), color: tok('accent') })),
            h(2, e.title),
            p(e.text, st({ color: tok('soft'), fontSize: px(18) })),
            list(
              [
                [
                  'Plateforme et positionnement',
                  'Nom et logo',
                  'Charte et système graphique',
                  'Guide de marque',
                ],
                [
                  'Ateliers et parcours utilisateurs',
                  'Design d’interface',
                  'Développement et mise en ligne',
                  'Accessibilité et performance',
                ],
                [
                  'Concepts et campagnes',
                  'Photographie et illustration',
                  'Édition et signalétique',
                  'Déclinaisons réseaux',
                ],
                ['Identité animée', 'Vidéos courtes', 'Animations d’interface', 'Habillage événementiel'],
              ][i] as string[],
              'disc',
              st({ color: tok('soft') }),
            ),
          ]),
        ]),
      ],
      i % 2 ? { backgroundColor: tok('surface') } : {},
    ),
  ),
  section('Formats', [
    eyebrow('Formats'),
    h(2, 'Trois façons de travailler ensemble'),
    {
      type: 'tabs',
      props: { label: 'Formats d’accompagnement' },
      children: [
        [
          'Projet',
          'Un périmètre, un calendrier, un budget fixés ensemble. Idéal pour une création ou une refonte.',
          ['Cadrage en deux ateliers', 'Livrables détaillés', 'Point hebdomadaire'],
        ],
        [
          'Accompagnement',
          'Une équipe dédiée quelques jours par mois, pour faire vivre votre marque dans la durée.',
          ['Engagement trimestriel', 'Interlocuteur unique', 'Priorités revues chaque mois'],
        ],
        [
          'Atelier',
          'Une à deux journées intensives pour débloquer une question : nom, positionnement, arborescence.',
          ['Préparation en amont', 'Restitution écrite', 'Recommandations actionnables'],
        ],
      ].map(([title, text, items]) => ({
        type: 'tab',
        props: { title },
        style: st({ ...pad(8, 0) }),
        children: [
          box('stack', 'Contenu', st({ direction: 'column', gap: px(16) }), [
            p(text as string, st({ fontSize: px(18), color: tok('soft'), maxWidth: px(720) })),
            list(items as string[], 'circle'),
          ]),
        ],
      })),
    },
  ]),
  cta,
]);

const projets: T = page('Projets', [
  pageHero(
    'Réalisations',
    'Des projets dont nous sommes fiers.',
    'Une sélection de collaborations récentes, de la start-up au groupe industriel.',
  ),
  section('Galerie', [
    h(2, 'Toutes nos réalisations'),
    grid(
      'Projets',
      [2, 2, 1],
      40,
      PROJECTS.map((_, i) => projectCard(i)),
      { anim: reveal(32, 120) },
    ),
  ]),
  cta,
]);

const contact: T = page('Contact', [
  pageHero(
    'Contact',
    'Parlons de votre projet.',
    'Un appel, un e-mail ou un café au studio : choisissez ce qui vous convient.',
  ),
  section('Coordonnées', [
    grid('Coordonnées et étapes', [2, 1, 1], 32, [
      card([
        h(2, 'Nous joindre', st({ fontSize: px(32) })),
        ...[
          ['mail', 'bonjour@studio-orbe.example'],
          ['phone', '04 65 71 20 26'],
          ['map-pin', '8 passage des Orbes, 69002 Lyon'],
          ['clock', 'Du lundi au vendredi, 9 h – 18 h'],
        ].map(([ic, text]) =>
          box('stack', 'Ligne', st({ direction: 'row', gap: px(14), align: 'center' }), [
            icon(ic as string, st({ fontSize: px(22), color: tok('accent') })),
            p(text as string, st({ fontSize: px(18) })),
          ]),
        ),
        row([primary('Écrire au studio', EMAIL), ghost('Appeler', PHONE)]),
      ]),
      card([
        h(2, 'Et ensuite ?', st({ fontSize: px(32) })),
        list(
          [
            'Nous lisons votre message et revenons vers vous sous 48 heures.',
            'Un premier échange de 30 minutes pour comprendre vos enjeux.',
            'Une proposition détaillée : démarche, calendrier et budget.',
          ],
          'decimal',
          st({ color: tok('soft'), fontSize: px(18) }),
        ),
      ]),
    ]),
  ]),
  section('Questions fréquentes', [
    h(2, 'Questions fréquentes'),
    {
      type: 'accordion',
      children: [
        [
          'Travaillez-vous avec des entreprises hors de Lyon ?',
          'Oui : la moitié de nos clients sont ailleurs en France ou en Europe. Nous nous déplaçons pour les moments clés et travaillons à distance le reste du temps.',
        ],
        [
          'Quel budget prévoir pour une identité de marque ?',
          'Chaque projet est différent ; une identité complète démarre généralement autour de quelques dizaines de milliers d’euros. Nous vous donnons une estimation dès le premier échange.',
        ],
        [
          'Combien de temps dure un projet ?',
          'Comptez six à douze semaines pour une identité ou un site vitrine, davantage pour une plateforme. Le calendrier est fixé ensemble au démarrage.',
        ],
        [
          'Serons-nous autonomes ensuite ?',
          'C’est notre objectif : guides, fichiers sources, formation de vos équipes et un site que vous pouvez faire évoluer.',
        ],
      ].map(([q, a]) => ({
        type: 'accordion-item',
        props: { title: q, open: false },
        children: [p(a as string, st({ color: tok('soft') }))],
      })),
    },
  ]),
]);

// ---------- Header, footer, site ----------
const header: T = box(
  'container',
  'Header',
  st({ backgroundColor: tok('ink'), color: tok('text'), ...pad(20, 32) }, undefined, pad(16, 20)),
  [
    box(
      'stack',
      'Barre',
      st({
        direction: 'row',
        justify: 'space-between',
        align: 'center',
        wrap: true,
        gap: px(24),
        ...center(1200),
      }),
      [
        btn(
          'Orbe',
          { page: 'accueil' },
          'plain',
          st({ color: tok('text'), fontFamily: tok('titres'), fontSize: px(26), fontWeight: 700 }),
        ),
        {
          type: 'nav',
          props: { menuId: 'principal', label: 'Navigation principale', toggle: 'Menu', collapse: 'mobile' },
          style: st({ color: tok('text'), fontWeight: 500 }),
        },
        btn(
          'Parlons projet',
          { page: 'contact' },
          'primary',
          st(
            { backgroundColor: tok('accent'), color: tok('ink'), radius: px(999), ...pad(10, 20) },
            undefined,
            { hidden: true },
          ),
        ),
      ],
    ),
  ],
  { props: { tag: 'header' } },
);
const footer: T = box(
  'container',
  'Footer',
  st({ backgroundColor: tok('surface'), color: tok('text'), ...pad(72, 32) }, undefined, pad(48, 20)),
  [
    box('stack', 'Contenu', st({ direction: 'column', gap: px(48), ...center(1200) }), [
      grid('Colonnes', [3, 3, 1], 40, [
        box('stack', 'Studio', st({ direction: 'column', gap: px(12) }), [
          p('Orbe', st({ fontFamily: tok('titres'), fontSize: px(28), fontWeight: 700 })),
          p('Studio de design et de marque indépendant, à Lyon depuis 2014.', st({ color: tok('soft') })),
        ]),
        box('stack', 'Navigation', st({ direction: 'column', gap: px(12) }), [
          p('Navigation', st({ fontWeight: 600 })),
          {
            type: 'links',
            props: { menuId: 'principal', label: 'Navigation du pied de page', direction: 'column' },
            style: st({ color: tok('soft') }),
          },
        ]),
        box('stack', 'Contact', st({ direction: 'column', gap: px(12) }), [
          p('Contact', st({ fontWeight: 600 })),
          p('bonjour@studio-orbe.example', st({ color: tok('soft') })),
          p('04 65 71 20 26', st({ color: tok('soft') })),
          p('8 passage des Orbes, 69002 Lyon', st({ color: tok('soft') })),
        ]),
      ]),
      { type: 'divider', style: st({ backgroundColor: tok('line'), marginTop: px(0), marginBottom: px(0) }) },
      p(
        '© 2026 Studio Orbe — site de démonstration réalisé avec Netvolution Studio.',
        st({ color: tok('soft'), fontSize: px(14) }),
      ),
    ]),
  ],
  { props: { tag: 'footer' } },
);

const px2 = (base: number, tablet: number, mobile: number) => ({
  base: px(base),
  tablet: px(tablet),
  mobile: px(mobile),
});

export const agenceCreative: TemplateSpec = {
  id: 'agence-creative',
  name: 'Studio Orbe — agence créative',
  description:
    'Cinq pages sombres et graphiques : hero lumineux, références, expertises, projets, méthode, équipe, formats en onglets, contact et FAQ. Space Grotesk et Inter, dégradés et animations.',
  siteUrl: 'https://studio-orbe.example',
  prefix: 'norb',
  fonts: ['space-grotesk', 'inter'],
  media,
  tokens: {
    colors: {
      ink: { label: 'Encre (fond)', value: C.ink },
      surface: { label: 'Surface', value: C.surface },
      line: { label: 'Filet', value: C.line },
      text: { label: 'Texte', value: C.text },
      soft: { label: 'Texte secondaire', value: C.soft },
      accent: { label: 'Accent violet', value: C.accent },
      coral: { label: 'Accent corail', value: C.coral },
    },
    sizes: {
      section: { label: 'Section', group: 'spacing', value: px2(128, 96, 72) },
      bloc: { label: 'Bloc', group: 'spacing', value: px2(48, 40, 32) },
      carte: { label: 'Carte', group: 'radius', value: { base: px(20) } },
    },
    fonts: {
      titres: { label: 'Titres (Space Grotesk)', stack: ['Space Grotesk', 'system-ui', 'sans-serif'] },
      texte: { label: 'Texte (Inter)', stack: ['Inter', 'system-ui', 'sans-serif'] },
    },
    textStyles: {
      body: {
        label: 'Texte courant',
        style: {
          base: { fontFamily: tok('texte'), fontSize: px(17), lineHeight: 1.65 },
          mobile: { fontSize: px(16) },
        },
      },
      h1: {
        label: 'Titre 1',
        style: {
          base: { fontFamily: tok('titres'), fontSize: px(84), fontWeight: 700, lineHeight: 1.02 },
          tablet: { fontSize: px(62) },
          mobile: { fontSize: px(42), lineHeight: 1.08 },
        },
      },
      h2: {
        label: 'Titre 2',
        style: {
          base: { fontFamily: tok('titres'), fontSize: px(52), fontWeight: 600, lineHeight: 1.08 },
          tablet: { fontSize: px(42) },
          mobile: { fontSize: px(32) },
        },
      },
      h3: {
        label: 'Titre 3',
        style: {
          base: { fontFamily: tok('titres'), fontSize: px(24), fontWeight: 600, lineHeight: 1.25 },
          mobile: { fontSize: px(21) },
        },
      },
    },
  },
  menus: [
    {
      id: 'principal',
      name: 'Menu principal',
      items: [
        { id: 'e1', label: 'Accueil', link: { kind: 'page', pageId: 'accueil' } },
        { id: 'e2', label: 'L’agence', link: { kind: 'page', pageId: 'agence' } },
        { id: 'e3', label: 'Expertises', link: { kind: 'page', pageId: 'expertises' } },
        { id: 'e4', label: 'Projets', link: { kind: 'page', pageId: 'projets' } },
        { id: 'e5', label: 'Contact', link: { kind: 'page', pageId: 'contact' } },
      ],
    },
  ],
  header,
  footer,
  pages: [
    {
      id: 'accueil',
      title: 'Accueil',
      slug: '',
      description:
        'Studio Orbe, studio de design et de marque à Lyon : identités, sites et campagnes qui ne passent pas inaperçus.',
      tree: home,
    },
    {
      id: 'agence',
      title: 'L’agence',
      slug: 'agence',
      description: 'Un studio indépendant de huit personnes : notre manifeste, nos valeurs et notre équipe.',
      tree: agence,
    },
    {
      id: 'expertises',
      title: 'Expertises',
      slug: 'expertises',
      description:
        'Identité de marque, sites et produits numériques, direction artistique, motion : nos quatre savoir-faire.',
      tree: expertises,
    },
    {
      id: 'projets',
      title: 'Projets',
      slug: 'projets',
      description: 'Une sélection de projets récents : identités, sites, campagnes et design systems.',
      tree: projets,
    },
    {
      id: 'contact',
      title: 'Contact',
      slug: 'contact',
      description:
        'Parlons de votre projet : coordonnées du studio, prochaines étapes et questions fréquentes.',
      tree: contact,
    },
  ],
};
