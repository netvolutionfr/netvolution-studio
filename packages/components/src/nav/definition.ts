import { entityIdSchema, linkHref, type MenuItem, type RenderContext, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import type { NavItem } from './view.tsx';

/** Menu entries with their href and current/active state for the page being rendered. */
export function navItems(list: readonly MenuItem[], ctx: RenderContext): NavItem[] {
  return list.map((item) => {
    const children = navItems(item.children ?? [], ctx);
    const current = item.link.kind === 'page' && item.link.pageId === ctx.pageId;
    return {
      label: item.label,
      href: linkHref(item.link, ctx.site, ctx.basePath, ctx.mediaBase),
      current,
      active: current || children.some((c) => c.current),
      children,
    };
  });
}

/**
 * Site navigation (SB-03): a menu of the site rendered as `<nav><ul>`. Below the
 * `collapse` breakpoint the list folds into a `<details>` menu button, which works
 * without JavaScript. Sub-entries (one level) open on hover and keyboard focus.
 */
export const nav = defineComponent({
  type: 'nav',
  version: 1,
  label: t('components.nav.name'),
  category: 'content',
  props: z.strictObject({
    menuId: entityIdSchema.nullable(),
    label: z.string().min(1).max(80),
    toggle: z.string().min(1).max(40),
    collapse: z.enum(['never', 'tablet', 'mobile']),
  }),
  defaults: {
    props: {
      menuId: null,
      label: 'content.nav.label',
      toggle: 'content.nav.toggle',
      collapse: 'mobile',
    },
  },
  resolve: (props, ctx) => {
    const menu = ctx.site.menus?.find((m) => m.id === props.menuId);
    return { label: props.label, toggle: props.toggle, items: menu ? navItems(menu.items, ctx) : [] };
  },
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'menu', prop: 'menuId', label: t('components.nav.fields.menuId') },
    { kind: 'text', prop: 'label', label: t('components.nav.fields.label') },
    { kind: 'text', prop: 'toggle', label: t('components.nav.fields.toggle') },
    {
      kind: 'select',
      prop: 'collapse',
      label: t('components.nav.fields.collapse'),
      options: [
        { value: 'mobile', label: t('components.nav.options.collapse.mobile') },
        { value: 'tablet', label: t('components.nav.options.collapse.tablet') },
        { value: 'never', label: t('components.nav.options.collapse.never') },
      ],
    },
  ],
  display: 'block',
  css:
    '.ns-nav ul{list-style:none;margin:0;padding:0}' +
    '.ns-nav a{color:inherit;text-decoration:none}' +
    '.ns-nav a:hover,.ns-nav a[aria-current="page"]{text-decoration:underline;text-underline-offset:4px}' +
    '.ns-nav-active>a{font-weight:600}' +
    '.ns-nav-bar>.ns-nav-list{display:flex;flex-wrap:wrap;gap:8px 24px}' +
    '.ns-nav-bar li{position:relative}' +
    '.ns-nav-bar .ns-nav-list .ns-nav-list{display:none;position:absolute;top:100%;left:0;z-index:10;' +
    'min-width:180px;padding:8px 0;background:#fff;color:#111827;box-shadow:0 8px 24px rgba(0,0,0,.12)}' +
    '.ns-nav-bar li:hover>.ns-nav-list,.ns-nav-bar li:focus-within>.ns-nav-list{display:block}' +
    '.ns-nav-bar .ns-nav-list .ns-nav-list a{display:block;padding:6px 16px}' +
    '.ns-nav-menu{display:none}' +
    '.ns-nav-menu>summary{cursor:pointer;font-weight:600}' +
    '.ns-nav-menu .ns-nav-list{display:grid;gap:8px;padding-top:12px}' +
    '.ns-nav-menu .ns-nav-list .ns-nav-list{padding:8px 0 0 16px}',
  // At and below the collapse breakpoint, the bar gives way to the menu button.
  breakpointCss: (props, selector, breakpoint) =>
    breakpoint === props.collapse
      ? `${selector} .ns-nav-bar{display:none}${selector} .ns-nav-menu{display:block}`
      : '',
  viewName: 'Nav',
});
