import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const container = defineComponent({
  type: 'container',
  version: 1,
  label: t('components.container.name'),
  category: 'layout',
  props: z.strictObject({ tag: z.enum(['section', 'div', 'main', 'header', 'footer', 'article', 'aside']) }),
  defaults: { props: { tag: 'section' } },
  children: 'any',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'background', 'visibility', 'position', 'effects'],
  fields: [
    {
      kind: 'select',
      prop: 'tag',
      label: t('components.container.fields.tag'),
      options: ['section', 'div', 'main', 'header', 'footer', 'article', 'aside'].map((tag) => ({
        value: tag,
        label: `<${tag}>`,
      })),
    },
  ],
  display: 'block',
  viewName: 'Container',
});
