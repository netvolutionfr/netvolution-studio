import { linkHref, linkSchema } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const button = defineComponent({
  type: 'button',
  version: 1,
  label: 'Bouton',
  category: 'content',
  props: z.strictObject({
    label: z.string().min(1).max(120),
    link: linkSchema,
    variant: z.enum(['primary', 'secondary', 'text']),
  }),
  defaults: {
    props: { label: 'En savoir plus', link: { kind: 'url', href: '#' }, variant: 'primary' },
    style: { base: { alignSelf: 'start' } },
  },
  // Page link → href of the page's current slug.
  resolve: (props, { site, basePath, mediaBase }) => ({
    label: props.label,
    href: linkHref(props.link, site, basePath, mediaBase),
    variant: props.variant,
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'background', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'text', prop: 'label', label: 'Libellé' },
    { kind: 'link', prop: 'link', label: 'Lien' },
    {
      kind: 'select',
      prop: 'variant',
      label: 'Apparence',
      options: [
        { value: 'primary', label: 'Principal' },
        { value: 'secondary', label: 'Secondaire' },
        { value: 'text', label: 'Lien texte' },
      ],
    },
  ],
  display: 'inline-block',
  css:
    '.ns-button{display:inline-block;padding:12px 20px;border-radius:8px;font-weight:600;line-height:1.2;' +
    'text-align:center;text-decoration:none;border:2px solid transparent}' +
    '.ns-button-primary{background-color:#3b5bdb;color:#ffffff}' +
    '.ns-button-secondary{border-color:currentColor;color:#3b5bdb}' +
    '.ns-button-text{padding:0;border:0;color:#3b5bdb;text-decoration:underline}',
  viewName: 'Button',
});
