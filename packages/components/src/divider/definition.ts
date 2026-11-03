import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const divider = defineComponent({
  type: 'divider',
  version: 1,
  label: 'Séparateur',
  category: 'content',
  props: z.strictObject({}),
  defaults: { props: {} },
  children: 'none',
  // Thickness = minHeight, color = backgroundColor.
  styleGroups: ['spacing', 'size', 'item', 'background', 'visibility', 'position', 'effects'],
  fields: [],
  display: 'block',
  css: '.ns-divider{border:0;margin:24px 0;min-height:1px;background-color:#e5e7eb}',
  viewName: 'Divider',
});
