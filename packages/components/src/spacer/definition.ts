import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const spacer = defineComponent({
  type: 'spacer',
  version: 1,
  label: t('components.spacer.name'),
  category: 'layout',
  props: z.strictObject({}),
  defaults: { props: {}, style: { base: { minHeight: { value: 32, unit: 'px' } } } },
  children: 'none',
  styleGroups: ['size', 'item', 'visibility', 'position', 'effects'],
  fields: [],
  display: 'block',
  css: '.ns-spacer{flex-shrink:0}',
  viewName: 'Spacer',
});
