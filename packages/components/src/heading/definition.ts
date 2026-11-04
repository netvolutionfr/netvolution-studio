import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { resolveRuns, runsSchema } from '../rich.ts';

export const heading = defineComponent({
  type: 'heading',
  version: 1,
  label: t('components.heading.name'),
  category: 'content',
  props: z.strictObject({
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    /** Plain text (the original format) or rich runs: bold, italic, color, link (ADR-0020). */
    text: z.union([z.string().min(1).max(500), runsSchema]),
  }),
  defaults: { props: { level: 2, text: 'content.heading' } },
  resolve: (props, ctx) => ({
    level: props.level,
    runs: typeof props.text === 'string' ? [{ text: props.text }] : resolveRuns(props.text, ctx),
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'visibility', 'position', 'effects'],
  inline: { prop: 'text' },
  fields: [
    { kind: 'richText', prop: 'text', label: t('components.heading.fields.text') },
    {
      kind: 'select',
      prop: 'level',
      label: t('components.heading.fields.level'),
      options: [1, 2, 3, 4, 5, 6].map((l) => ({ value: l, label: `H${l}` })),
    },
  ],
  display: 'block',
  viewName: 'Heading',
});
