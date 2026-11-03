import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { resolveRuns, runsSchema } from '../rich.ts';

/** Numbered markers make an ordered list (`<ol>`); the others an unordered one (`<ul>`). */
const ORDERED = ['decimal', 'lower-alpha', 'upper-roman'] as const;

export const list = defineComponent({
  type: 'list',
  version: 1,
  label: t('components.list.name'),
  category: 'content',
  props: z.strictObject({
    marker: z.enum(['disc', 'circle', 'square', 'none', ...ORDERED]),
    /** Each item is a rich text line (bold, italic, links), like the Text component. */
    items: z.array(runsSchema).min(1).max(100),
  }),
  defaults: {
    props: {
      marker: 'disc',
      items: [
        [{ text: 'content.list.first' }],
        [{ text: 'content.list.second' }],
        [{ text: 'content.list.third' }],
      ],
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
      label: t('components.list.fields.marker'),
      options: [
        { value: 'disc', label: t('components.list.options.marker.disc') },
        { value: 'circle', label: t('components.list.options.marker.circle') },
        { value: 'square', label: t('components.list.options.marker.square') },
        { value: 'none', label: t('components.list.options.marker.none') },
        { value: 'decimal', label: t('components.list.options.marker.decimal') },
        { value: 'lower-alpha', label: t('components.list.options.marker.lower-alpha') },
        { value: 'upper-roman', label: t('components.list.options.marker.upper-roman') },
      ],
    },
    { kind: 'richTextList', prop: 'items', label: t('components.list.fields.items') },
  ],
  css:
    '.ns-list{margin:0;padding-left:1.5em}.ns-list>li+li{margin-top:.35em}.ns-list>li::marker{color:currentColor}' +
    '.ns-list-circle{list-style-type:circle}.ns-list-square{list-style-type:square}' +
    '.ns-list-none{list-style-type:none;padding-left:0}.ns-list-lower-alpha{list-style-type:lower-alpha}' +
    '.ns-list-upper-roman{list-style-type:upper-roman}',
  display: 'block',
  viewName: 'List',
});
