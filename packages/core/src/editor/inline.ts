import { type Site, symbolById } from '../document/schema.ts';
import { type Message, msg } from '../i18n/index.ts';
import type { PropField, Registry } from '../registry/registry.ts';
import { parentOf } from './commands.ts';

/**
 * Where an in-place edit of a node writes (ADR-0025): its own prop, or the parameter of the
 * enclosing shared component instance that exposes it. `refused`: a text the user cannot edit
 * here (inside an instance, not exposed); null: not a text editable in place.
 */
export type InlineTarget =
  | { prop: string; field: PropField; instance?: { id: string; paramId: string } }
  | { refused: Message };

export function inlineTarget(doc: Site, nodeId: string, registry: Registry): InlineTarget | null {
  const node = doc.nodes[nodeId];
  const prop = node && registry.get(node.type)?.inline?.prop;
  const field = prop && registry.get(node.type)?.fields.find((f) => f.prop === prop);
  if (!prop || !field || !['text', 'richText', 'richTextList'].includes(field.kind)) return null;
  // Nearest instance root (the node itself included), with the child-index path from it.
  const path: number[] = [];
  for (let id = nodeId; ; ) {
    const instance = doc.nodes[id]?.instance;
    if (instance) {
      const sym = symbolById(doc, instance.symbolId);
      const param = sym?.params.find((p) => p.prop === prop && p.path.join() === path.join());
      if (param) return { prop, field, instance: { id, paramId: param.id } };
      return { refused: msg('canvas.instanceText', { name: sym?.name ?? instance.symbolId }) };
    }
    const parent = parentOf(doc, id);
    if (!parent) return { prop, field };
    path.unshift(parent.children.indexOf(id));
    id = parent.id;
  }
}
