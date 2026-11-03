import { entityIdSchema, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { navItems } from '../nav/definition.ts';

/** List of links (SB-07): the top-level entries of a site menu, e.g. in a footer column. */
export const links = defineComponent({
  type: 'links',
  version: 1,
  label: t('components.links.name'),
  category: 'content',
  props: z.strictObject({
    menuId: entityIdSchema.nullable(),
    label: z.string().min(1).max(80),
    direction: z.enum(['column', 'row']),
  }),
  defaults: { props: { menuId: null, label: 'content.links', direction: 'column' } },
  resolve: (props, ctx) => {
    const menu = ctx.site.menus?.find((m) => m.id === props.menuId);
    return {
      label: props.label,
      direction: props.direction,
      items: navItems(menu?.items.map(({ children: _, ...item }) => item) ?? [], ctx),
    };
  },
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'menu', prop: 'menuId', label: t('components.links.fields.menuId') },
    { kind: 'text', prop: 'label', label: t('components.links.fields.label') },
    {
      kind: 'select',
      prop: 'direction',
      label: t('components.links.fields.direction'),
      options: [
        { value: 'column', label: t('components.links.options.direction.column') },
        { value: 'row', label: t('components.links.options.direction.row') },
      ],
    },
  ],
  display: 'block',
  css:
    '.ns-links ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}' +
    '.ns-links-row ul{flex-direction:row;flex-wrap:wrap;gap:8px 24px}' +
    '.ns-links a{color:inherit}.ns-links a[aria-current="page"]{font-weight:600}',
  viewName: 'Links',
});
