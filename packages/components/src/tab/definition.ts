import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

/** Panel of a tabs component; its title is the tab label, and its heading when JavaScript is off. */
export const tab = defineComponent({
  type: 'tab',
  version: 1,
  label: t('components.tab.name'),
  category: 'layout',
  props: z.strictObject({ title: z.string().min(1).max(120) }),
  defaults: { props: { title: 'content.tab' } },
  resolve: (props, _ctx, node) => ({ title: props.title, id: node.id }),
  children: 'any',
  styleGroups: ['spacing', 'item', 'visibility', 'position', 'effects'],
  // The label is the tab button rendered by the parent Tabs.
  inline: { prop: 'title', selector: '#{id}-tab' },
  fields: [{ kind: 'text', prop: 'title', label: t('components.tab.fields.title') }],
  display: 'block',
  viewName: 'Tab',
});
