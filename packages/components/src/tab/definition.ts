import { z } from 'zod';
import { defineComponent } from '../define.ts';

/** Panel of a tabs component; its title is the tab label, and its heading when JavaScript is off. */
export const tab = defineComponent({
  type: 'tab',
  version: 1,
  label: 'Onglet',
  category: 'layout',
  props: z.strictObject({ title: z.string().min(1).max(120) }),
  defaults: { props: { title: 'Onglet' } },
  resolve: (props, _ctx, node) => ({ title: props.title, id: node.id }),
  children: 'any',
  styleGroups: ['spacing', 'item', 'visibility', 'position', 'effects'],
  fields: [{ kind: 'text', prop: 'title', label: 'Titre de l’onglet' }],
  display: 'block',
  viewName: 'Tab',
});
