import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const grid = defineComponent({
  type: 'grid',
  version: 1,
  label: t('components.grid.name'),
  category: 'layout',
  props: z.strictObject({}),
  defaults: { props: {}, style: { base: { columns: 3, gap: { value: 24, unit: 'px' } } } },
  children: 'any',
  styleGroups: [
    'spacing',
    'size',
    'grid',
    'item',
    'typography',
    'background',
    'visibility',
    'position',
    'effects',
  ],
  fields: [],
  display: 'grid',
  css: '.ns-grid{display:grid;grid-template-columns:minmax(0,1fr)}',
  viewName: 'Grid',
});
