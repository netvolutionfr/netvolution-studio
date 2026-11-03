import { z } from 'zod';
import { defineComponent } from '../define.ts';

/** Item of an accordion: a native `<details>` (keyboard, screen readers, no JS). */
export const accordionItem = defineComponent({
  type: 'accordion-item',
  version: 1,
  label: 'Élément d’accordéon',
  category: 'layout',
  props: z.strictObject({ title: z.string().min(1).max(200), open: z.boolean() }),
  defaults: { props: { title: 'Question', open: false } },
  children: 'any',
  styleGroups: ['spacing', 'item', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'text', prop: 'title', label: 'Titre' },
    { kind: 'boolean', prop: 'open', label: 'Ouvert au chargement (et pour l’éditer dans le canvas)' },
  ],
  display: 'block',
  css:
    '.ns-accordion-item{border-bottom:1px solid #e5e7eb}' +
    '.ns-accordion-item>summary{cursor:pointer;padding:16px 0;font-weight:600}' +
    '.ns-accordion-body{padding:0 0 16px}',
  viewName: 'AccordionItem',
});
