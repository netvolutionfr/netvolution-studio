import { type ContentRef, type NodeTemplate, contentRef as ref, type SymbolCategory, t } from '@ns/core';

const px = (value: number) => ({ value, unit: 'px' as const });
const column: NodeTemplate = {
  type: 'stack',
  name: 'content.sections.column',
  style: { base: { gap: px(16) } },
};

/**
 * Built-in section library (CS-01, ADR-0011): familiar compositions of generic components (VE-04,
 * CLAUDE §7). Inserted as an independent copy by default, or as a linked instance once added to the
 * site as a shared component. Names and descriptions follow the interface language; the content
 * (`content.sections.*` keys, ADR-0024) follows the site language, translated on insertion.
 */
export type LibrarySection = {
  id: string;
  name: string;
  category: SymbolCategory;
  description: string;
  version: number;
  tree: NodeTemplate;
};

const heading = (text: string | ContentRef, level = 2, size = 32): NodeTemplate => ({
  type: 'heading',
  props: { level, text },
  style: { base: { fontSize: px(size) } },
});
/** A required field of a contact form (ADR-0026); label and name are `content.*` keys. */
const formField = (label: string, name: string, type: string): NodeTemplate => ({
  type: 'form-field',
  props: { label, name, type, required: true, placeholder: '', options: [] },
});
const paragraph = (text: string | ContentRef, style?: NodeTemplate['style']): NodeTemplate => ({
  type: 'text',
  props: { content: [{ text }] },
  ...(style ? { style } : {}),
});
const grid3 = (children: NodeTemplate[]): NodeTemplate => ({
  type: 'grid',
  name: 'content.sections.grid',
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
  name: 'content.sections.card',
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
const image = (caption?: ContentRef): NodeTemplate => ({
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
    description: t('sections.builtIn.section.description'),
    version: 1,
    name: t('sections.builtIn.section.name'),
    tree: {
      type: 'container',
      name: 'content.sections.section',
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
    description: t('sections.builtIn.row2.description'),
    version: 1,
    name: t('sections.builtIn.row2.name'),
    tree: {
      type: 'grid',
      name: 'content.sections.row2',
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
    description: t('sections.builtIn.row3.description'),
    version: 1,
    name: t('sections.builtIn.row3.name'),
    tree: {
      type: 'grid',
      name: 'content.sections.row3',
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
    description: t('sections.builtIn.hero.description'),
    version: 1,
    name: t('sections.builtIn.hero.name'),
    tree: {
      type: 'stack',
      name: 'content.sections.hero',
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
          name: 'content.sections.tagline',
          style: { base: { grow: 1, basis: px(0), gap: px(16) } },
          children: [
            {
              type: 'heading',
              props: { level: 1, text: 'content.sections.mainHeading' },
              style: { base: { fontSize: px(48) } },
            },
            { type: 'text', props: { content: [{ text: 'content.sections.offer' }] } },
            { type: 'button' },
          ],
        },
        {
          type: 'spacer',
          name: 'content.sections.visual',
          style: { base: { grow: 1, basis: px(0), minHeight: px(240) } },
        },
      ],
    },
  },
  {
    id: 'logo',
    category: 'elements',
    description: t('sections.builtIn.logo.description'),
    version: 1,
    name: t('sections.builtIn.logo.name'),
    tree: {
      type: 'image',
      name: 'content.sections.logo',
      props: { assetId: null, alt: '', decorative: false, fit: 'contain', loading: 'eager' },
      style: { base: { maxWidth: px(180) } },
    },
  },
  {
    id: 'card',
    category: 'features',
    description: t('sections.builtIn.card.description'),
    version: 1,
    name: t('sections.builtIn.card.name'),
    tree: {
      type: 'stack',
      name: 'content.sections.card',
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
          props: { level: 3, text: 'content.sections.cardTitle' },
          style: { base: { fontSize: px(22) } },
        },
        {
          type: 'text',
          props: { content: [{ text: 'content.sections.cardText' }] },
        },
        {
          type: 'button',
          props: { label: 'content.button', link: { kind: 'url', href: '#' }, variant: 'text' },
        },
      ],
    },
  },
  {
    id: 'cta',
    category: 'cta',
    description: t('sections.builtIn.cta.description'),
    version: 1,
    name: t('sections.builtIn.cta.name'),
    tree: {
      type: 'stack',
      name: 'content.sections.cta',
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
          props: { level: 2, text: 'content.sections.ctaHeading' },
          style: { base: { fontSize: px(32), color: '#ffffff', textAlign: 'center' } },
        },
        {
          type: 'text',
          props: { content: [{ text: 'content.sections.ctaText' }] },
          style: { base: { color: '#ffffff', textAlign: 'center' } },
        },
        {
          type: 'button',
          props: {
            label: 'content.sections.ctaButton',
            link: { kind: 'url', href: '#' },
            variant: 'primary',
          },
          style: { base: { alignSelf: 'center' } },
        },
      ],
    },
  },
  {
    id: 'gallery',
    category: 'gallery',
    description: t('sections.builtIn.gallery.description'),
    version: 1,
    name: t('sections.builtIn.gallery.name'),
    tree: {
      type: 'grid',
      name: 'content.sections.gallery',
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
          caption: ref('content.sections.caption', { n: i }),
        },
      })),
    },
  },
  {
    id: 'accordion',
    category: 'elements',
    description: t('sections.builtIn.accordion.description'),
    version: 1,
    name: t('sections.builtIn.accordion.name'),
    tree: {
      type: 'accordion',
      name: 'content.sections.faq',
      children: [1, 2].map((i) => ({
        type: 'accordion-item',
        props: { title: ref('content.sections.question', { n: i }), open: i === 1 },
        children: [
          { type: 'text', props: { content: [{ text: ref('content.sections.answer', { n: i }) }] } },
        ],
      })),
    },
  },
  {
    id: 'tabs',
    category: 'elements',
    description: t('sections.builtIn.tabs.description'),
    version: 1,
    name: t('sections.builtIn.tabs.name'),
    tree: {
      type: 'tabs',
      children: [1, 2].map((i) => ({
        type: 'tab',
        props: { title: ref('content.sections.tab', { n: i }) },
        children: [
          { type: 'text', props: { content: [{ text: ref('content.sections.tabContent', { n: i }) }] } },
        ],
      })),
    },
  },
  {
    id: 'presentation',
    category: 'presentation',
    description: t('sections.builtIn.presentation.description'),
    version: 1,
    name: t('sections.builtIn.presentation.name'),
    tree: {
      type: 'grid',
      name: 'content.sections.presentation',
      style: {
        base: { columns: 2, gap: px(48), align: 'center', paddingTop: px(64), paddingBottom: px(64) },
        mobile: { columns: 1, gap: px(24), paddingTop: px(40), paddingBottom: px(40) },
      },
      children: [
        image(),
        {
          type: 'stack',
          name: 'content.sections.text',
          style: { base: { gap: px(16) } },
          children: [
            heading('content.sections.about'),
            paragraph('content.sections.aboutText'),
            {
              type: 'button',
              props: { label: 'content.button', link: { kind: 'url', href: '#' }, variant: 'secondary' },
            },
          ],
        },
      ],
    },
  },
  {
    id: 'features',
    category: 'features',
    description: t('sections.builtIn.features.description'),
    version: 1,
    name: t('sections.builtIn.features.name'),
    tree: block('content.sections.features', [
      heading('content.sections.why'),
      grid3(
        [
          ['zap', 'content.sections.fast', 'content.sections.fastText'],
          ['shield-check', 'content.sections.secure', 'content.sections.secureText'],
          ['heart', 'content.sections.accessible', 'content.sections.accessibleText'],
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
    description: t('sections.builtIn.testimonials.description'),
    version: 1,
    name: t('sections.builtIn.testimonials.name'),
    tree: block('content.sections.testimonials', [
      heading('content.sections.trust'),
      grid3(
        [1, 2, 3].map((i) =>
          card([
            {
              type: 'icon',
              props: { name: 'quote', label: '' },
              style: { base: { fontSize: px(28), color: '#6b7280' } },
            },
            paragraph('content.sections.quote', { base: { fontSize: px(18) } }),
            paragraph(ref('content.sections.quoteAuthor', { n: i }), { base: { fontWeight: 600 } }),
          ]),
        ),
      ),
    ]),
  },
  {
    id: 'pricing',
    category: 'pricing',
    description: t('sections.builtIn.pricing.description'),
    version: 1,
    name: t('sections.builtIn.pricing.name'),
    tree: block('content.sections.pricing', [
      heading('content.sections.plans'),
      grid3(
        [
          ['content.sections.essential', '490 €'],
          ['content.sections.pro', '990 €'],
          ['content.sections.custom', 'content.sections.onQuote'],
        ].map(([name, price]) =>
          card([
            heading(name as string, 3, 22),
            { type: 'heading', props: { level: 4, text: price }, style: { base: { fontSize: px(36) } } },
            paragraph('content.sections.planText'),
            {
              type: 'button',
              props: {
                label: 'content.sections.choose',
                link: { kind: 'url', href: '#' },
                variant: 'primary',
              },
            },
          ]),
        ),
      ),
    ]),
  },
  {
    id: 'team',
    category: 'team',
    description: t('sections.builtIn.team.description'),
    version: 1,
    name: t('sections.builtIn.team.name'),
    tree: block('content.sections.team', [
      heading('content.sections.theTeam'),
      grid3(
        [1, 2, 3].map((i) => ({
          type: 'stack',
          name: 'content.sections.member',
          style: { base: { gap: px(8) } },
          children: [
            image(),
            heading(ref('content.sections.memberName', { n: i }), 3, 20),
            paragraph('content.sections.role', { base: { color: '#4b5563' } }),
          ],
        })),
      ),
    ]),
  },
  {
    id: 'contact',
    category: 'contact',
    description: t('sections.builtIn.contact.description'),
    version: 2,
    name: t('sections.builtIn.contact.name'),
    tree: {
      type: 'grid',
      name: 'content.sections.contact',
      style: {
        base: { columns: 2, gap: px(48), paddingTop: px(64), paddingBottom: px(64) },
        mobile: { columns: 1, gap: px(24), paddingTop: px(40), paddingBottom: px(40) },
      },
      children: [
        {
          type: 'stack',
          name: 'content.sections.invitation',
          style: { base: { gap: px(16) } },
          children: [
            heading('content.sections.talk'),
            paragraph('content.sections.answerTime'),
            // ADR-0026: the address is set by the user (a form service or the host's script).
            {
              type: 'form',
              name: 'content.sections.contactForm',
              props: { action: '', submitLabel: 'content.form.submit', hidden: [] },
              children: [
                formField('content.form.name', 'content.form.nameField', 'text'),
                formField('content.form.email', 'email', 'email'),
                formField('content.form.message', 'message', 'textarea'),
                formField('content.form.consent', 'content.form.consentField', 'checkbox'),
                paragraph('content.form.notice'),
              ],
            },
          ],
        },
        {
          type: 'stack',
          name: 'content.sections.details',
          style: { base: { gap: px(12) } },
          children: [
            ['phone', '01 23 45 67 89'],
            ['mail', 'contact@exemple.fr'],
            ['map-pin', '12 rue des Arts, Lille'],
          ].map(([icon, text]) => ({
            type: 'stack',
            name: 'content.sections.line',
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
