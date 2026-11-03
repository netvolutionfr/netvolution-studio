import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const container = defineComponent({
  type: 'container',
  version: 1,
  label: 'Conteneur',
  category: 'layout',
  props: z.strictObject({ tag: z.enum(['section', 'div', 'main', 'header', 'footer', 'article', 'aside']) }),
  defaults: { props: { tag: 'section' } },
  children: 'any',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'background', 'visibility', 'position', 'effects'],
  fields: [
    {
      kind: 'select',
      prop: 'tag',
      label: 'Balise HTML',
      options: ['section', 'div', 'main', 'header', 'footer', 'article', 'aside'].map((t) => ({
        value: t,
        label: `<${t}>`,
      })),
    },
  ],
  display: 'block',
  viewName: 'Container',
});
