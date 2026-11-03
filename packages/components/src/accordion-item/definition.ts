import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

/** Item of an accordion: a native `<details>` (keyboard, screen readers, no JS). */
export const accordionItem = defineComponent({
  type: 'accordion-item',
  version: 1,
  label: t('components.accordionItem.name'),
  category: 'layout',
  props: z.strictObject({ title: z.string().min(1).max(200), open: z.boolean() }),
  defaults: { props: { title: 'content.accordionItem', open: false } },
  children: 'any',
  styleGroups: ['spacing', 'item', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'text', prop: 'title', label: t('components.accordionItem.fields.title') },
    { kind: 'boolean', prop: 'open', label: t('components.accordionItem.fields.open') },
  ],
  display: 'block',
  css:
    '.ns-accordion-item{border-bottom:1px solid #e5e7eb}' +
    '.ns-accordion-item>summary{cursor:pointer;padding:16px 0;font-weight:600}' +
    '.ns-accordion-body{padding:0 0 16px}',
  viewName: 'AccordionItem',
});
