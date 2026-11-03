import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { resolveRuns, runsSchema } from '../rich.ts';

/** Numbered markers make an ordered list (`<ol>`); the others an unordered one (`<ul>`). */
const ORDERED = ['decimal', 'lower-alpha', 'upper-roman'] as const;

export const list = defineComponent({
  type: 'list',
  version: 1,
  label: 'Liste',
  category: 'content',
  props: z.strictObject({
    marker: z.enum(['disc', 'circle', 'square', 'none', ...ORDERED]),
    /** Each item is a rich text line (bold, italic, links), like the Text component. */
    items: z.array(runsSchema).min(1).max(100),
  }),
  defaults: {
    props: {
      marker: 'disc',
      items: [[{ text: 'Premier élément' }], [{ text: 'Deuxième élément' }], [{ text: 'Troisième élément' }]],
    },
  },
  resolve: (props, ctx) => ({
    ordered: (ORDERED as readonly string[]).includes(props.marker),
    marker: props.marker,
    items: props.items.map((runs) => resolveRuns(runs, ctx)),
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'visibility', 'position', 'effects'],
  fields: [
    {
      kind: 'select',
      prop: 'marker',
      label: 'Puces',
      options: [
        { value: 'disc', label: '• Disque' },
        { value: 'circle', label: '◦ Cercle' },
        { value: 'square', label: '▪ Carré' },
        { value: 'none', label: 'Aucune' },
        { value: 'decimal', label: '1. Numéros' },
        { value: 'lower-alpha', label: 'a. Lettres' },
        { value: 'upper-roman', label: 'I. Chiffres romains' },
      ],
    },
    { kind: 'richTextList', prop: 'items', label: 'Éléments' },
  ],
  css:
    '.ns-list{margin:0;padding-left:1.5em}.ns-list>li+li{margin-top:.35em}.ns-list>li::marker{color:currentColor}' +
    '.ns-list-circle{list-style-type:circle}.ns-list-square{list-style-type:square}' +
    '.ns-list-none{list-style-type:none;padding-left:0}.ns-list-lower-alpha{list-style-type:lower-alpha}' +
    '.ns-list-upper-roman{list-style-type:upper-roman}',
  display: 'block',
  viewName: 'List',
});
