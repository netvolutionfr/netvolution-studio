import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { ICONS } from './icons.ts';

const names = Object.keys(ICONS) as [keyof typeof ICONS, ...(keyof typeof ICONS)[]];

/**
 * Icon (SB-07) from the registry's icon set (Lucide subset): documents name an icon, the SVG
 * elements come from the registry, never from the document. Sized by the font size, colored by
 * the text color. Decorative unless it has an accessible label.
 */
export const icon = defineComponent({
  type: 'icon',
  version: 1,
  label: 'Icône',
  category: 'content',
  props: z.strictObject({ name: z.enum(names), label: z.string().max(80) }),
  defaults: { props: { name: 'check', label: '' }, style: { base: { fontSize: { value: 32, unit: 'px' } } } },
  resolve: (props) => ({ label: props.label, node: ICONS[props.name].node }),
  children: 'none',
  styleGroups: ['spacing', 'item', 'typography', 'visibility', 'position', 'effects'],
  fields: [
    {
      kind: 'select',
      prop: 'name',
      label: 'Icône',
      options: names.map((n) => ({ value: n, label: ICONS[n].label })),
    },
    { kind: 'text', prop: 'label', label: 'Nom accessible (vide = décorative)' },
  ],
  display: 'inline-block',
  css: '.ns-icon{display:inline-block;width:1em;height:1em;vertical-align:middle;flex-shrink:0}',
  viewName: 'Icon',
});
