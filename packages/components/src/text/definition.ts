import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { type Inline, resolveRuns, runsSchema } from '../rich.ts';

export const text = defineComponent({
  type: 'text',
  version: 1,
  label: 'Texte',
  category: 'content',
  /** One paragraph (runs, the original format) or several (ADR-0020); the editor writes paragraphs. */
  props: z.strictObject({ content: z.union([runsSchema, z.array(runsSchema).min(1).max(50)]) }),
  defaults: { props: { content: [{ text: 'Votre texte' }] } },
  resolve: (props, ctx) => {
    const paragraphs = Array.isArray(props.content[0])
      ? (props.content as Inline[][])
      : [props.content as Inline[]];
    return { paragraphs: paragraphs.map((runs) => resolveRuns(runs, ctx)) };
  },
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'visibility', 'position', 'effects'],
  fields: [{ kind: 'richText', prop: 'content', label: 'Texte', paragraphs: true }],
  css: '.ns-text>p+p{margin-top:.8em}',
  display: 'block',
  viewName: 'Text',
});
