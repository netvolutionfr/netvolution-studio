// Template « Cabinet Valéor » — advisory firm (consulting, law, architecture…): light and editorial,
// serif titles, fir green and brass. Original design and copy; contact details are fictional.
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
import { facade, lines, portrait } from './visuals.ts';

const C = {
  paper: '#faf8f3',
  white: '#ffffff',
  ink: '#1c2430',
  soft: '#545d6b',
  fir: '#1f4d45',
  firLight: '#e8efe9',
  brass: '#765828',
  line: '#e4ded2',
};
const EMAIL: LinkTo = { url: 'mailto:contact@cabinet-valeor.example' };
const PHONE: LinkTo = { url: 'tel:+33536491804' };
const ADDRESS = '18 allée des Conseils, 33000 Bordeaux';

const PARTNERS = [
  {
    name: 'Anne Delcour',
    role: 'Associée fondatrice — stratégie et gouvernance',
    bio: 'Vingt-cinq ans auprès de dirigeants de PME et d’ETI, ancienne directrice financière dans l’industrie.',
    bg: '#e8efe9',
    skin: '#efc6a6',
    cloth: '#1f4d45',
    hair: '#5a4632',
  },
  {
    name: 'Karim Benali',
    role: 'Associé — transmission et financement',
    bio: 'Spécialiste des opérations de cession et de reprise, il accompagne les dirigeants jusqu’au closing.',
    bg: '#f3ebdd',
    skin: '#c99068',
    cloth: '#8a6a35',
    hair: '#1d1712',
  },
  {
    name: 'Sophie Marchetti',
    role: 'Associée — transformation et organisation',
    bio: 'Elle conduit les projets de réorganisation avec une attention constante aux équipes.',
    bg: '#e9edf3',
    skin: '#f2cdb0',
    cloth: '#3b5070',
    hair: '#a35d2e',
  },
];

const media: Media[] = [
  {
    id: 'avalfacade1',
    file: 'avalfacade1.svg',
    svg: facade(1200, 900, C.firLight, C.fir, C.brass),
    width: 1200,
    height: 900,
    name: 'Illustration : façade du cabinet',
    alt: 'Illustration de la façade du cabinet, au trait',
  },
  {
    id: 'avallignes1',
    file: 'avallignes1.svg',
    svg: lines(1600, 800, C.fir, '#2c6359'),
    width: 1600,
    height: 800,
    name: 'Motif : lignes diagonales',
    alt: '',
  },
  ...PARTNERS.map((m, i) => ({
    id: `avalassoc${i}0`,
    file: `avalassoc${i}0.svg`,
    svg: portrait(600, 700, m.bg, m.skin, m.cloth, m.hair, 21 + i),
    width: 600,
    height: 700,
    name: `Portrait ${m.name}`,
    alt: `Portrait illustré de ${m.name}`,
  })),
];

// ---------- Building blocks ----------
const eyebrow = (text: string) => p(text, st({ color: tok('brass'), fontWeight: 600, fontSize: px(15) }));
const lead = (text: string, max = 640) =>
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
    st({ direction: 'column', gap: tok('bloc'), width: pct(100), ...center(1160), ...extra }),
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
const primary = (label: string, to: LinkTo) =>
  btn(
    label,
    to,
    'primary',
    st({ backgroundColor: tok('fir'), color: tok('white'), radius: px(6), ...pad(14, 24) }),
  );
const secondary = (label: string, to: LinkTo) =>
  btn(label, to, 'secondary', st({ color: tok('fir'), radius: px(6), ...pad(12, 22) }));
const textLink = (label: string, to: LinkTo) => btn(label, to, 'text', st({ color: tok('fir') }));
const card = (children: T[], extra = {}): T => ({
  ...box(
    'stack',
    'Carte',
    st(
      {
        direction: 'column',
        gap: px(14),
        backgroundColor: tok('white'),
        borderWidth: px(1),
        borderStyle: 'solid',
        borderColor: tok('line'),
        radius: px(14),
        shadow: { x: px(0), y: px(1), blur: px(3), spread: px(0), color: '#1c24300f' },
        ...pad(32, 30),
        ...extra,
      },
      undefined,
      pad(26, 24),
    ),
    children,
  ),
  anim: lift,
});
const pageHero = (kicker: string, title: string, text: string): T =>
  section(
    'En-tête de page',
    [eyebrow(kicker), h(1, title, st({ maxWidth: px(860) })), lead(text)],
    { backgroundColor: tok('fir-light') },
    { gap: px(22) },
  );
const partner = (i: number, withBio: boolean): T => {
  const m = PARTNERS[i] as (typeof PARTNERS)[number];
  return box('stack', m.name, st({ direction: 'column', gap: px(10) }), [
    img(
      `avalassoc${i}0`,
      `Portrait illustré de ${m.name}`,
      st({ radius: px(14), aspectRatio: '3/4', width: pct(100) }, undefined, { aspectRatio: '1/1' }),
      { fit: 'cover' },
    ),
    h(3, m.name, st({ marginTop: px(8) })),
    p(m.role, st({ color: tok('brass'), fontWeight: 600, fontSize: px(15) })),
    ...(withBio ? [p(m.bio, st({ color: tok('soft') }))] : []),
  ]);
};
const cta: T = section(
  'Appel à l’action',
  [
    h(
      2,
      'Parlons de votre situation, en toute confidentialité.',
      st({ maxWidth: px(760), color: tok('white') }),
    ),
    p(
      'Un premier rendez-vous d’une heure, sans engagement, pour poser le diagnostic et voir si nous sommes les bons interlocuteurs.',
      st({ fontSize: px(19), maxWidth: px(640), color: tok('fir-light') }),
    ),
    row([
      btn(
        'Prendre rendez-vous',
        { page: 'contact' },
        'primary',
        st({ backgroundColor: tok('paper'), color: tok('fir'), radius: px(6), ...pad(14, 24) }),
      ),
      btn('05 36 49 18 04', PHONE, 'secondary', st({ color: tok('white'), radius: px(6), ...pad(12, 22) })),
    ]),
  ],
  {
    backgroundColor: tok('fir'),
    backgroundImage: { asset: 'avallignes1', size: 'cover', position: 'center' },
    gradient: {
      kind: 'linear',
      angle: 90,
      stops: [
        { color: '#1f4d45', at: 0 },
        { color: '#1f4d45d9', at: 60 },
        { color: '#1f4d4599', at: 100 },
      ],
    },
  },
  { gap: px(24) },
);
const page = (name: string, sections: T[]): T =>
  box('container', name, st({ backgroundColor: tok('paper'), color: tok('ink') }), sections, {
    props: { tag: 'main' },
  });
const faq = (items: [string, string][]): T => ({
  type: 'accordion',
  children: items.map(([q, a]) => ({
    type: 'accordion-item',
    props: { title: q, open: false },
    children: [p(a, st({ color: tok('soft') }))],
  })),
});

// ---------- Pages ----------
const EXPERTISES = [
  {
    icon: 'globe',
    title: 'Stratégie & développement',
    text: 'Clarifier la vision, choisir ses marchés, construire un plan à trois ans que vos équipes peuvent porter.',
    missions: [
      'Diagnostic stratégique',
      'Plan de développement',
      'Croissance externe',
      'Ouverture à l’international',
    ],
  },
  {
    icon: 'users',
    title: 'Transmission & cession',
    text: 'Préparer la transmission de votre entreprise, familiale ou externe, et défendre sa juste valeur.',
    missions: [
      'Évaluation de l’entreprise',
      'Recherche de repreneurs',
      'Négociation et protocole',
      'Accompagnement post-cession',
    ],
  },
  {
    icon: 'shield-check',
    title: 'Gouvernance',
    text: 'Organiser les pouvoirs, les instances et les relations entre associés pour décider sereinement.',
    missions: [
      'Pacte d’associés',
      'Comité stratégique',
      'Administrateur indépendant',
      'Relations avec les investisseurs',
    ],
  },
  {
    icon: 'award',
    title: 'Financement',
    text: 'Trouver les bons financements au bon moment : banques, fonds, aides publiques.',
    missions: ['Plan de financement', 'Dossier bancaire', 'Levée de fonds', 'Aides et subventions'],
  },
  {
    icon: 'zap',
    title: 'Transformation',
    text: 'Faire évoluer l’organisation, les processus et les outils sans perdre l’adhésion des équipes.',
    missions: [
      'Organisation et rôles',
      'Conduite du changement',
      'Choix des outils',
      'Pilotage par indicateurs',
    ],
  },
  {
    icon: 'leaf',
    title: 'Entreprise responsable',
    text: 'Intégrer les enjeux sociaux et environnementaux à la stratégie, au-delà de la conformité.',
    missions: ['Diagnostic RSE', 'Feuille de route', 'Reporting extra-financier', 'Mobilisation des équipes'],
  },
];

const home: T = page('Accueil', [
  section(
    'Hero',
    [
      grid('Hero', [2, 1, 1], 64, [
        {
          ...box('stack', 'Accroche', st({ direction: 'column', gap: px(26), justify: 'center' }), [
            eyebrow('Conseil aux dirigeants — Bordeaux, depuis 2004'),
            h(1, 'Des décisions claires, prises avec le bon conseil.'),
            lead(
              'Stratégie, transmission, gouvernance : un cabinet indépendant aux côtés des dirigeants de PME et d’ETI, de la réflexion à la mise en œuvre.',
            ),
            row(
              [
                primary('Prendre rendez-vous', { page: 'contact' }),
                textLink('Nos expertises →', { page: 'expertises' }),
              ],
              24,
            ),
          ]),
          anim: reveal(24, 120).map((a) => ({ ...a, trigger: 'load' as const })),
        },
        img(
          'avalfacade1',
          'Illustration de la façade du cabinet, au trait',
          st(
            {
              radius: px(24),
              width: pct(100),
              aspectRatio: '4/3',
              shadow: { x: px(0), y: px(24), blur: px(48), spread: px(-12), color: '#1c243040' },
            },
            undefined,
            { aspectRatio: '3/2' },
          ),
          { fit: 'cover', loading: 'eager' },
        ),
      ]),
    ],
    { paddingTop: px(96) },
  ),
  section(
    'Garanties',
    [
      grid(
        'Garanties',
        [4, 2, 1],
        24,
        [
          ['award', 'Vingt ans d’expérience', 'Plus de 300 dirigeants accompagnés'],
          ['shield-check', 'Confidentialité', 'Engagement écrit dès le premier échange'],
          ['users', 'Un associé dédié', 'Votre interlocuteur du début à la fin'],
          ['clock', 'Réactivité', 'Réponse sous 24 heures ouvrées'],
        ].map(([ic, title, text]) =>
          box('stack', title as string, st({ direction: 'row', gap: px(14), align: 'start' }), [
            icon(ic as string, st({ fontSize: px(26), color: tok('fir') })),
            box('stack', 'Texte', st({ direction: 'column', gap: px(4) }), [
              p(title as string, st({ fontWeight: 700 })),
              p(text as string, st({ color: tok('soft'), fontSize: px(15) })),
            ]),
          ]),
        ),
        { anim: reveal(16, 90) },
      ),
    ],
    { paddingTop: px(40), paddingBottom: px(40), backgroundColor: tok('white') },
  ),
  section('Expertises', [
    eyebrow('Expertises'),
    h(2, 'Nos domaines d’intervention', st({ maxWidth: px(720) })),
    grid(
      'Cartes',
      [3, 2, 1],
      24,
      EXPERTISES.map((e) =>
        card([
          icon(e.icon, st({ fontSize: px(28), color: tok('brass') })),
          h(3, e.title),
          p(e.text, st({ color: tok('soft') })),
          textLink('En savoir plus →', { page: 'expertises' }),
        ]),
      ),
      { anim: reveal(24, 100) },
    ),
  ]),
  section(
    'Approche',
    [
      grid('Approche', [2, 1, 1], 64, [
        box('stack', 'Intro', st({ direction: 'column', gap: px(20) }), [
          eyebrow('Notre approche'),
          h(2, 'Du diagnostic à la décision, puis à l’action.'),
          p(
            'Nous ne livrons pas un rapport de plus. Nous travaillons avec vous et vos équipes jusqu’à ce que la décision soit prise et mise en œuvre.',
            st({ color: tok('soft'), fontSize: px(18) }),
          ),
        ]),
        box(
          'stack',
          'Étapes',
          st({ direction: 'column', gap: px(28) }),
          [
            [
              'I',
              'Écouter',
              'Entretiens avec vous, vos associés, vos équipes clés : nous partons de la réalité du terrain.',
            ],
            [
              'II',
              'Éclairer',
              'Analyse, options chiffrées, risques : un diagnostic partagé, écrit simplement.',
            ],
            ['III', 'Agir', 'Plan d’action, accompagnement des décisions et suivi jusqu’aux résultats.'],
          ].map(([n, title, text]) =>
            box('stack', title as string, st({ direction: 'row', gap: px(20), align: 'start' }), [
              p(
                n as string,
                st({
                  fontFamily: tok('titres'),
                  fontSize: px(40),
                  lineHeight: 1,
                  color: tok('brass'),
                  basis: px(56),
                }),
              ),
              box('stack', 'Texte', st({ direction: 'column', gap: px(6) }), [
                h(3, title as string),
                p(text as string, st({ color: tok('soft') })),
              ]),
            ]),
          ),
          { anim: reveal(20, 140) },
        ),
      ]),
    ],
    { backgroundColor: tok('white') },
  ),
  section(
    'Chiffres',
    [
      grid(
        'Chiffres clés',
        [4, 2, 2],
        32,
        [
          ['20', 'ans d’expérience'],
          ['300+', 'dirigeants accompagnés'],
          ['85 %', 'de clients qui nous recommandent'],
          ['3', 'associés, une seule équipe'],
        ].map(([n, label]) =>
          box('stack', 'Chiffre', st({ direction: 'column', gap: px(6) }), [
            p(
              n as string,
              st(
                { fontFamily: tok('titres'), fontSize: px(56), lineHeight: 1, color: tok('white') },
                undefined,
                { fontSize: px(40) },
              ),
            ),
            p(label as string, st({ color: tok('fir-light') })),
          ]),
        ),
        { anim: reveal(16, 100) },
      ),
    ],
    { backgroundColor: tok('fir'), paddingTop: px(72), paddingBottom: px(72) },
  ),
  section('Associés', [
    eyebrow('Les associés'),
    h(2, 'Des interlocuteurs qui connaissent votre métier'),
    grid(
      'Associés',
      [3, 3, 1],
      32,
      [0, 1, 2].map((i) => partner(i, false)),
      { anim: reveal(24, 120) },
    ),
    textLink('Découvrir le cabinet →', { page: 'cabinet' }),
  ]),
  section(
    'Témoignages',
    [
      eyebrow('Témoignages'),
      h(2, 'Ils nous ont confié leurs décisions'),
      grid(
        'Témoignages',
        [2, 1, 1],
        24,
        [
          [
            '« Valéor nous a aidés à préparer la transmission de l’entreprise familiale sereinement, en associant toute la famille. Un accompagnement rare. »',
            'Bruno Lefèvre',
            'président, menuiserie industrielle (120 salariés)',
          ],
          [
            '« Un regard extérieur exigeant et bienveillant. Le plan stratégique est devenu notre feuille de route, et il est vraiment appliqué. »',
            'Nadia Roche',
            'directrice générale, réseau de cliniques vétérinaires',
          ],
        ].map(([quote, name, role]) =>
          card([
            icon('quote', st({ fontSize: px(30), color: tok('brass') })),
            p(quote as string, st({ fontFamily: tok('titres'), fontSize: px(21), lineHeight: 1.45 })),
            p(
              [{ text: name as string, bold: true }, { text: ` — ${role}` }],
              st({ color: tok('soft'), fontSize: px(15) }),
            ),
          ]),
        ),
        { anim: reveal(24, 120) },
      ),
    ],
    { backgroundColor: tok('white') },
  ),
  section('Questions fréquentes', [
    h(2, 'Questions fréquentes'),
    faq([
      [
        'À quel moment faire appel à un cabinet de conseil ?',
        'Avant une décision structurante (croissance, cession, réorganisation), ou quand vous sentez que l’entreprise plafonne sans en voir clairement la cause. Plus tôt nous intervenons, plus les options sont nombreuses.',
      ],
      [
        'Intervenez-vous en dehors de la Nouvelle-Aquitaine ?',
        'Oui, partout en France. Nous nous déplaçons pour les temps forts et travaillons à distance entre deux rendez-vous.',
      ],
      [
        'Comment sont fixés vos honoraires ?',
        'Au forfait pour les diagnostics, sur devis pour les missions, au mois pour l’accompagnement. Le détail est sur la page Honoraires.',
      ],
      [
        'Comment garantissez-vous la confidentialité ?',
        'Un engagement de confidentialité est signé dès le premier rendez-vous, et vos documents restent sur vos outils ou sur un espace sécurisé.',
      ],
    ]),
  ]),
  cta,
]);

const cabinet: T = page('Le cabinet', [
  pageHero(
    'Le cabinet',
    'Indépendant depuis vingt ans, par choix.',
    'Valéor est né d’une conviction : les dirigeants de PME méritent le même niveau de conseil que les grands groupes, avec plus de proximité.',
  ),
  section('Histoire', [
    grid('Histoire', [2, 1, 1], 64, [
      img('avalfacade1', '', st({ radius: px(20), width: pct(100), aspectRatio: '4/3' }), { fit: 'cover' }),
      box('stack', 'Texte', st({ direction: 'column', gap: px(18), justify: 'center' }), [
        h(2, 'Notre histoire'),
        p(
          'Fondé à Bordeaux en 2004 par Anne Delcour, le cabinet a grandi au rythme de ses clients, sans jamais rejoindre de réseau ni de groupe.',
          st({ color: tok('soft'), fontSize: px(18) }),
        ),
        p(
          'Cette indépendance garantit des recommandations libres de tout conflit d’intérêts : nous ne vendons ni logiciel, ni produit financier, seulement notre regard et notre engagement.',
          st({ color: tok('soft'), fontSize: px(18) }),
        ),
      ]),
    ]),
  ]),
  section(
    'Valeurs',
    [
      eyebrow('Nos engagements'),
      h(2, 'Ce que vous pouvez attendre de nous'),
      grid(
        'Engagements',
        [3, 3, 1],
        24,
        [
          [
            'shield-check',
            'Indépendance',
            'Aucune commission, aucun produit à placer : nos seuls revenus sont vos honoraires.',
          ],
          [
            'heart',
            'Franchise',
            'Nous disons ce que nous voyons, avec tact, même quand le constat est difficile.',
          ],
          [
            'check',
            'Engagement',
            'Nous restons à vos côtés jusqu’à la mise en œuvre, pas seulement jusqu’à la recommandation.',
          ],
        ].map(([ic, title, text]) =>
          card([
            icon(ic as string, st({ fontSize: px(28), color: tok('brass') })),
            h(3, title as string),
            p(text as string, st({ color: tok('soft') })),
          ]),
        ),
        { anim: reveal(24, 100) },
      ),
    ],
    { backgroundColor: tok('white') },
  ),
  section('Associés', [
    eyebrow('Les associés'),
    h(2, 'Trois associés, une seule équipe'),
    grid(
      'Associés',
      [3, 3, 1],
      32,
      [0, 1, 2].map((i) => partner(i, true)),
      { anim: reveal(24, 120) },
    ),
  ]),
  cta,
]);

const expertises: T = page('Expertises', [
  pageHero(
    'Expertises',
    'Six domaines, une même exigence.',
    'Chaque mission est conduite par un associé, entouré des consultants dont votre situation a besoin.',
  ),
  ...EXPERTISES.map((e, i) =>
    section(
      e.title,
      [
        grid(e.title, [2, 1, 1], 48, [
          box('stack', 'Présentation', st({ direction: 'column', gap: px(16) }), [
            icon(e.icon, st({ fontSize: px(32), color: tok('brass') })),
            h(2, e.title, st({ fontSize: px(38) }, undefined, { fontSize: px(30) })),
            p(e.text, st({ color: tok('soft'), fontSize: px(18) })),
          ]),
          card([
            p('Exemples de missions', st({ fontWeight: 700 })),
            list(e.missions, 'square', st({ color: tok('soft') })),
          ]),
        ]),
      ],
      i % 2 ? { backgroundColor: tok('white') } : {},
    ),
  ),
  cta,
]);

const offer = (
  title: string,
  price: string,
  unit: string,
  text: string,
  items: string[],
  featured: boolean,
): T => ({
  ...box(
    'stack',
    title,
    st(
      {
        direction: 'column',
        gap: px(18),
        radius: px(16),
        ...pad(36, 32),
        borderWidth: px(1),
        borderStyle: 'solid',
        borderColor: featured ? tok('fir') : tok('line'),
        backgroundColor: featured ? tok('fir') : tok('white'),
        color: featured ? tok('white') : tok('ink'),
        shadow: featured
          ? { x: px(0), y: px(20), blur: px(40), spread: px(-12), color: '#1f4d4566' }
          : { x: px(0), y: px(1), blur: px(3), spread: px(0), color: '#1c24300f' },
      },
      undefined,
      pad(28, 24),
    ),
    [
      h(3, title),
      p([{ text: price, bold: true }], st({ fontFamily: tok('titres'), fontSize: px(40), lineHeight: 1.1 })),
      p(unit, st({ fontSize: px(15), color: featured ? tok('fir-light') : tok('soft') })),
      p(text, st({ color: featured ? tok('fir-light') : tok('soft') })),
      list(items, 'disc'),
      btn(
        'Prendre rendez-vous',
        { page: 'contact' },
        featured ? 'primary' : 'secondary',
        featured
          ? st({ backgroundColor: tok('paper'), color: tok('fir'), radius: px(6), ...pad(14, 24) })
          : st({ color: tok('fir'), radius: px(6), ...pad(12, 22) }),
      ),
    ],
  ),
  anim: lift,
});

const honoraires: T = page('Honoraires', [
  pageHero(
    'Honoraires',
    'Des honoraires clairs, annoncés à l’avance.',
    'Pas de surprise : chaque intervention fait l’objet d’une proposition écrite, détaillée et chiffrée avant de commencer.',
  ),
  section('Formules', [
    h(2, 'Trois formules selon votre besoin'),
    grid(
      'Formules',
      [3, 1, 1],
      24,
      [
        offer(
          'Diagnostic',
          '3 500 € HT',
          'forfait, deux à trois semaines',
          'Un état des lieux complet et des recommandations priorisées.',
          ['Entretiens avec la direction', 'Analyse financière et marché', 'Restitution écrite et orale'],
          false,
        ),
        offer(
          'Mission',
          'Sur devis',
          'selon le périmètre',
          'Un projet précis, conduit de bout en bout par un associé.',
          ['Cadrage et calendrier', 'Équipe dédiée', 'Comités de pilotage', 'Bilan de fin de mission'],
          true,
        ),
        offer(
          'Accompagnement',
          '1 900 € HT',
          'par mois, engagement trimestriel',
          'Un regard extérieur régulier pour piloter dans la durée.',
          ['Une demi-journée par mois', 'Disponibilité entre deux rendez-vous', 'Préparation des comités'],
          false,
        ),
      ],
      { anim: reveal(24, 120) },
    ),
    p(
      'Tarifs indicatifs d’un site de démonstration. Frais de déplacement hors Gironde facturés au réel.',
      st({ color: tok('soft'), fontSize: px(15) }),
    ),
  ]),
  section(
    'Questions sur les honoraires',
    [
      h(2, 'Questions sur les honoraires'),
      faq([
        [
          'Le premier rendez-vous est-il payant ?',
          'Non. Le premier rendez-vous, d’une heure environ, sert à comprendre votre situation et à vérifier que nous pouvons vous aider.',
        ],
        [
          'Peut-on bénéficier d’aides pour financer le conseil ?',
          'Selon votre région et votre projet, certaines missions peuvent être soutenues par des dispositifs publics. Nous vous orientons dès le cadrage.',
        ],
        [
          'Comment se passe la facturation ?',
          'Un acompte de 30 % au démarrage, le solde à la remise des livrables ; mensuellement pour l’accompagnement.',
        ],
      ]),
    ],
    { backgroundColor: tok('white') },
  ),
  cta,
]);

const contact: T = page('Contact', [
  pageHero(
    'Contact',
    'Prenons rendez-vous.',
    'Au cabinet, chez vous ou en visioconférence : le premier échange est sans engagement.',
  ),
  section('Coordonnées', [
    grid('Coordonnées et préparation', [2, 1, 1], 32, [
      card([
        h(2, 'Nous joindre', st({ fontSize: px(32) })),
        ...[
          ['mail', 'contact@cabinet-valeor.example'],
          ['phone', '05 36 49 18 04'],
          ['map-pin', ADDRESS],
          ['clock', 'Du lundi au vendredi, 8 h 30 – 18 h 30'],
        ].map(([ic, text]) =>
          box('stack', 'Ligne', st({ direction: 'row', gap: px(14), align: 'center' }), [
            icon(ic as string, st({ fontSize: px(22), color: tok('fir') })),
            p(text as string, st({ fontSize: px(18) })),
          ]),
        ),
        row([primary('Écrire au cabinet', EMAIL), secondary('Appeler', PHONE)]),
      ]),
      card([
        h(2, 'Préparer le rendez-vous', st({ fontSize: px(32) })),
        p('Pour un premier échange utile, il suffit de :', st({ color: tok('soft') })),
        list(
          [
            'Présenter votre entreprise et son actualité en quelques mots ;',
            'Préciser la décision ou la difficulté qui vous amène ;',
            'Si vous le souhaitez, joindre vos derniers comptes annuels.',
          ],
          'decimal',
          st({ color: tok('soft'), fontSize: px(17) }),
        ),
      ]),
    ]),
  ]),
]);

// ---------- Header, footer, site ----------
const header: T = box(
  'container',
  'Header',
  st(
    {
      backgroundColor: tok('white'),
      color: tok('ink'),
      ...pad(18, 32),
      shadow: { x: px(0), y: px(1), blur: px(0), spread: px(0), color: C.line },
    },
    undefined,
    pad(14, 20),
  ),
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
        ...center(1160),
      }),
      [
        btn(
          'Valéor',
          { page: 'accueil' },
          'plain',
          st({ color: tok('fir'), fontFamily: tok('titres'), fontSize: px(28), fontWeight: 600 }),
        ),
        {
          type: 'nav',
          props: { menuId: 'principal', label: 'Navigation principale', toggle: 'Menu', collapse: 'tablet' },
          style: st({ color: tok('ink'), fontWeight: 500 }),
        },
        btn(
          'Rendez-vous',
          { page: 'contact' },
          'primary',
          st(
            { backgroundColor: tok('fir'), color: tok('white'), radius: px(6), ...pad(10, 18) },
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
  st({ backgroundColor: tok('ink'), color: tok('paper'), ...pad(64, 32) }, undefined, pad(44, 20)),
  [
    box('stack', 'Contenu', st({ direction: 'column', gap: px(40), ...center(1160) }), [
      grid('Colonnes', [3, 3, 1], 40, [
        box('stack', 'Cabinet', st({ direction: 'column', gap: px(12) }), [
          p('Valéor', st({ fontFamily: tok('titres'), fontSize: px(28) })),
          p(
            'Cabinet indépendant de conseil aux dirigeants, à Bordeaux depuis 2004.',
            st({ color: '#c9ccd3' }),
          ),
        ]),
        box('stack', 'Navigation', st({ direction: 'column', gap: px(12) }), [
          p('Navigation', st({ fontWeight: 700 })),
          {
            type: 'links',
            props: { menuId: 'principal', label: 'Navigation du pied de page', direction: 'column' },
            style: st({ color: '#c9ccd3' }),
          },
        ]),
        box('stack', 'Contact', st({ direction: 'column', gap: px(12) }), [
          p('Contact', st({ fontWeight: 700 })),
          p('contact@cabinet-valeor.example', st({ color: '#c9ccd3' })),
          p('05 36 49 18 04', st({ color: '#c9ccd3' })),
          p(ADDRESS, st({ color: '#c9ccd3' })),
        ]),
      ]),
      { type: 'divider', style: st({ backgroundColor: '#3a4352', marginTop: px(0), marginBottom: px(0) }) },
      p(
        '© 2026 Cabinet Valéor — site de démonstration réalisé avec Netvolution Studio.',
        st({ color: '#c9ccd3', fontSize: px(14) }),
      ),
    ]),
  ],
  { props: { tag: 'footer' } },
);

const px3 = (base: number, tablet: number, mobile: number) => ({
  base: px(base),
  tablet: px(tablet),
  mobile: px(mobile),
});

export const cabinetConseil: TemplateSpec = {
  id: 'cabinet-conseil',
  name: 'Cabinet Valéor — conseil',
  description:
    'Cinq pages claires et éditoriales pour un cabinet (conseil, avocat, architecte…) : expertises, approche, associés, témoignages, honoraires, FAQ et contact. Fraunces et DM Sans.',
  siteUrl: 'https://cabinet-valeor.example',
  prefix: 'nval',
  fonts: ['fraunces', 'dm-sans'],
  media,
  tokens: {
    colors: {
      paper: { label: 'Papier (fond)', value: C.paper },
      white: { label: 'Blanc', value: C.white },
      ink: { label: 'Encre (texte)', value: C.ink },
      soft: { label: 'Texte secondaire', value: C.soft },
      fir: { label: 'Vert sapin', value: C.fir },
      'fir-light': { label: 'Vert clair', value: C.firLight },
      brass: { label: 'Laiton', value: C.brass },
      line: { label: 'Filet', value: C.line },
    },
    sizes: {
      section: { label: 'Section', group: 'spacing', value: px3(112, 88, 64) },
      bloc: { label: 'Bloc', group: 'spacing', value: px3(44, 36, 28) },
    },
    fonts: {
      titres: { label: 'Titres (Fraunces)', stack: ['Fraunces', 'Georgia', 'serif'] },
      texte: { label: 'Texte (DM Sans)', stack: ['DM Sans', 'system-ui', 'sans-serif'] },
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
          base: { fontFamily: tok('titres'), fontSize: px(64), fontWeight: 500, lineHeight: 1.08 },
          tablet: { fontSize: px(52) },
          mobile: { fontSize: px(38), lineHeight: 1.12 },
        },
      },
      h2: {
        label: 'Titre 2',
        style: {
          base: { fontFamily: tok('titres'), fontSize: px(44), fontWeight: 500, lineHeight: 1.15 },
          tablet: { fontSize: px(38) },
          mobile: { fontSize: px(30) },
        },
      },
      h3: {
        label: 'Titre 3',
        style: {
          base: { fontFamily: tok('titres'), fontSize: px(23), fontWeight: 600, lineHeight: 1.3 },
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
        { id: 'e2', label: 'Le cabinet', link: { kind: 'page', pageId: 'cabinet' } },
        { id: 'e3', label: 'Expertises', link: { kind: 'page', pageId: 'expertises' } },
        { id: 'e4', label: 'Honoraires', link: { kind: 'page', pageId: 'honoraires' } },
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
        'Cabinet Valéor, conseil indépendant aux dirigeants de PME et d’ETI à Bordeaux : stratégie, transmission, gouvernance.',
      tree: home,
    },
    {
      id: 'cabinet',
      title: 'Le cabinet',
      slug: 'cabinet',
      description:
        'Un cabinet indépendant depuis 2004 : notre histoire, nos engagements et nos trois associés.',
      tree: cabinet,
    },
    {
      id: 'expertises',
      title: 'Expertises',
      slug: 'expertises',
      description:
        'Stratégie, transmission, gouvernance, financement, transformation et RSE : nos six domaines d’intervention.',
      tree: expertises,
    },
    {
      id: 'honoraires',
      title: 'Honoraires',
      slug: 'honoraires',
      description:
        'Diagnostic au forfait, mission sur devis, accompagnement mensuel : des honoraires clairs, annoncés à l’avance.',
      tree: honoraires,
    },
    {
      id: 'contact',
      title: 'Contact',
      slug: 'contact',
      description: 'Prendre rendez-vous avec le cabinet : coordonnées et préparation du premier échange.',
      tree: contact,
    },
  ],
};
