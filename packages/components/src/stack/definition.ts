import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const stack = defineComponent({
  type: 'stack',
  version: 1,
  label: 'Pile (Flex)',
  category: 'layout',
  props: z.strictObject({}),
  defaults: { props: {} },
  children: 'any',
  styleGroups: [
    'spacing',
    'size',
    'flex',
    'item',
    'typography',
    'background',
    'visibility',
    'position',
    'effects',
  ],
  fields: [],
  display: 'flex',
  css: '.ns-stack{display:flex;flex-direction:column}',
  viewName: 'Stack',
});
