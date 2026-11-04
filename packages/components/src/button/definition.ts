import { linkHref, linkSchema, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const button = defineComponent({
  type: 'button',
  version: 1,
  label: t('components.button.name'),
  category: 'content',
  props: z.strictObject({
    label: z.string().min(1).max(120),
    link: linkSchema,
    variant: z.enum(['primary', 'secondary', 'text', 'plain']),
  }),
  defaults: {
    props: { label: 'content.button', link: { kind: 'url', href: '#' }, variant: 'primary' },
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
  inline: { prop: 'label' },
  fields: [
    { kind: 'text', prop: 'label', label: t('components.button.fields.label') },
    { kind: 'link', prop: 'link', label: t('components.button.fields.link') },
    {
      kind: 'select',
      prop: 'variant',
      label: t('components.button.fields.variant'),
      options: [
        { value: 'primary', label: t('components.button.options.variant.primary') },
        { value: 'secondary', label: t('components.button.options.variant.secondary') },
        { value: 'text', label: t('components.button.options.variant.text') },
        { value: 'plain', label: t('components.button.options.variant.plain') },
      ],
    },
  ],
  display: 'inline-block',
  css:
    '.ns-button{display:inline-block;padding:12px 20px;border-radius:8px;font-weight:600;line-height:1.2;' +
    'text-align:center;text-decoration:none;border:2px solid transparent}' +
    '.ns-button-primary{background-color:#3b5bdb;color:#ffffff}' +
    '.ns-button-secondary{border-color:currentColor;color:#3b5bdb}' +
    '.ns-button-text{padding:0;border:0;color:#3b5bdb;text-decoration:underline}' +
    // A logo or a link styled by its own color and font: no underline, the surrounding color.
    '.ns-button-plain{padding:0;border:0;border-radius:0;color:inherit}',
  viewName: 'Button',
});
