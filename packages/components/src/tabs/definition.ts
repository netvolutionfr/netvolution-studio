import { t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

/**
 * Tabs (SB-07). Server-rendered as the panels one under another, each with its title; the island
 * then shows the tab list (ARIA tabs pattern: arrows, Home, End) and one panel at a time.
 */
export const tabs = defineComponent({
  type: 'tabs',
  version: 1,
  label: t('components.tabs.name'),
  category: 'layout',
  props: z.strictObject({ label: z.string().min(1).max(80) }),
  defaults: { props: { label: 'content.tabs' } },
  resolve: (props, { site }, node) => ({
    label: props.label,
    tabs: node.children.map((id) => ({ id, title: String(site.nodes[id]?.props.title ?? '') })),
  }),
  children: ['tab'],
  styleGroups: ['spacing', 'size', 'item', 'visibility', 'position', 'effects'],
  fields: [{ kind: 'text', prop: 'label', label: t('components.tabs.fields.label') }],
  display: 'block',
  island: true,
  css:
    '.ns-tabs-list{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #e5e7eb;margin-bottom:16px}' +
    '.ns-tabs-list[hidden]{display:none}' +
    // Longhands only: the export's CSS minifier rewrites `background:none` (different computed value).
    '.ns-tabs-list [role="tab"]{font:inherit;color:inherit;background-color:transparent;background-image:none;border:0;border-bottom:2px solid transparent;' +
    'padding:8px 16px;cursor:pointer;margin-bottom:-1px}' +
    '.ns-tabs-list [aria-selected="true"]{border-bottom-color:currentColor;font-weight:600}' +
    '.ns-tab+.ns-tab{margin-top:24px}.ns-tab-title{margin:0 0 8px;font-size:1.125em}' +
    '.ns-tabs-js .ns-tab+.ns-tab{margin-top:0}.ns-tabs-js .ns-tab-title{display:none}',
  viewName: 'Tabs',
});
