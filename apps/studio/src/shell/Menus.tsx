import { type Link, type Menu, type MenuItem, t } from '@ns/core';
import { ArrowDown, ArrowUp, IndentDecrease, IndentIncrease, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton } from '../ui/index.ts';
import { TextField } from './fields.tsx';
import { LinkField } from './PropFields.tsx';
import { Section } from './StyleFields.tsx';
import { useEditor, useStore } from './store.ts';

/** Stable empty list: a selector must not return a new array on each call. */
const NONE: never[] = [];

type Entry = Omit<MenuItem, 'children'>;
/** Flat view of a menu: each entry with its depth (0, or 1 for a sub-entry). */
type Row = { item: Entry; depth: 0 | 1 };

const flatten = (menu: Menu): Row[] =>
  menu.items.flatMap((item) => {
    const { children = [], ...entry } = item;
    return [{ item: entry, depth: 0 as const }, ...children.map((c) => ({ item: c, depth: 1 as const }))];
  });

/** Rebuilds the tree; a leading sub-entry has no parent and becomes top-level. */
function unflatten(rows: Row[]): MenuItem[] {
  const items: MenuItem[] = [];
  for (const { item, depth } of rows) {
    const parent = items.at(-1);
    if (depth === 1 && parent) parent.children = [...(parent.children ?? []), item];
    else items.push({ ...item });
  }
  return items;
}

const freeId = (taken: Set<string>, prefix: string) => {
  for (let i = 1; ; i++) if (!taken.has(`${prefix}${i}`)) return `${prefix}${i}`;
};

/** Menu editor (SB-03): named menus, entries to a page or a URL, order and one sub-level. */
export function Menus() {
  const store = useStore();
  const menus = useEditor((s) => s.doc.menus) ?? NONE;
  const homeId = useEditor((s) => s.doc.settings.homePageId);
  const save = (menu: Menu, label: string) => store.dispatch('setMenu', { menu }, label);

  return (
    <div className="ds">
      {menus.map((menu) => {
        const rows = flatten(menu);
        const update = (next: Row[], label: string) => save({ ...menu, items: unflatten(next) }, label);
        const edit = (i: number, patch: Partial<Row>, label: string) =>
          update(
            rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
            label,
          );
        const move = (i: number, to: number) => {
          const next = [...rows];
          const [row] = next.splice(i, 1);
          if (row) next.splice(to, 0, row);
          return update(next, t('menus.moveEntry'));
        };
        return (
          <Section key={menu.id} title={menu.name || menu.id}>
            <TextField
              label={t('menus.menuName')}
              value={menu.name}
              onChange={(name) => save({ ...menu, name }, t('menus.menuName'))}
            />
            <ul className="menu-rows">
              {rows.map((row, i) => (
                <li key={row.item.id} className={row.depth ? 'menu-row menu-row-sub' : 'menu-row'}>
                  <TextField
                    label={t('menus.label')}
                    value={row.item.label}
                    onChange={(label) => edit(i, { item: { ...row.item, label } }, t('menus.entryLabel'))}
                  />
                  <LinkField
                    label={t('menus.link')}
                    value={row.item.link}
                    onChange={(link: Link | null) =>
                      edit(i, { item: { ...row.item, link: link ?? row.item.link } }, t('menus.entryLink'))
                    }
                  />
                  <div
                    className="inspector-actions"
                    role="toolbar"
                    aria-label={t('menus.actionsOn', { label: row.item.label })}
                  >
                    <IconButton
                      size="sm"
                      label={t('menus.moveUp')}
                      icon={ArrowUp}
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                    />
                    <IconButton
                      size="sm"
                      label={t('menus.moveDown')}
                      icon={ArrowDown}
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, i + 1)}
                    />
                    {row.depth === 0 ? (
                      <IconButton
                        size="sm"
                        label={t('menus.indent')}
                        icon={IndentIncrease}
                        disabled={i === 0 || rows[i + 1]?.depth === 1}
                        onClick={() => edit(i, { depth: 1 }, t('menus.indentDone'))}
                      />
                    ) : (
                      <IconButton
                        size="sm"
                        label={t('menus.outdent')}
                        icon={IndentDecrease}
                        onClick={() => edit(i, { depth: 0 }, t('menus.outdentDone'))}
                      />
                    )}
                    <IconButton
                      size="sm"
                      variant="danger"
                      label={t('menus.removeEntry')}
                      icon={Trash2}
                      onClick={() =>
                        update(
                          rows.filter((_, j) => j !== i),
                          t('menus.removeEntryDone'),
                        )
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="ds-add">
              <Button
                size="sm"
                icon={Plus}
                onClick={() =>
                  update(
                    [
                      ...rows,
                      {
                        item: {
                          id: freeId(new Set(rows.map((r) => r.item.id)), 'e'),
                          label: t('menus.newEntry'),
                          link: { kind: 'page', pageId: homeId },
                        },
                        depth: 0,
                      },
                    ],
                    t('menus.addEntry'),
                  )
                }
              >
                {t('menus.addEntry')}
              </Button>
              <Button
                size="sm"
                icon={Trash2}
                variant="danger"
                onClick={() => store.dispatch('removeMenu', { id: menu.id }, t('menus.removeMenu'))}
              >
                {t('menus.removeMenu')}
              </Button>
            </div>
          </Section>
        );
      })}
      <p className="hint">{t('menus.hint')}</p>
      <div className="ds-add">
        <Button
          size="sm"
          icon={Plus}
          onClick={() =>
            save(
              { id: freeId(new Set(menus.map((m) => m.id)), 'menu-'), name: t('menus.newMenu'), items: [] },
              t('menus.addMenu'),
            )
          }
        >
          {t('menus.newMenu')}
        </Button>
      </div>
    </div>
  );
}
