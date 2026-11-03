import { z } from 'zod';
import { defineComponent } from '../define.ts';

/** Accordion (SB-07): a group of `<details>` items, accessible and functional without JavaScript. */
export const accordion = defineComponent({
  type: 'accordion',
  version: 1,
  label: 'Accordéon',
  category: 'layout',
  props: z.strictObject({}),
  defaults: { props: {} },
  children: ['accordion-item'],
  styleGroups: ['spacing', 'size', 'item', 'visibility', 'position', 'effects'],
  fields: [],
  display: 'block',
  css: '.ns-accordion{border-top:1px solid #e5e7eb}',
  viewName: 'Accordion',
});
