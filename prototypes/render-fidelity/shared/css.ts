// Pure style engine: document -> CSS. Desktop-first: base, then max-width
// media queries from widest to narrowest, so a breakpoint inherits from the
// nearest wider one through the normal cascade.
type Decls = Record<string, string>;
type Node = { id: string; style?: Record<string, Decls>; children?: Node[] };
type Doc = { breakpoints: { id: string; maxWidth: number }[]; root: Node };

const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const rule = (id: string, d: Decls) =>
  `.ns-${id}{${Object.entries(d).map(([k, v]) => `${kebab(k)}:${v}`).join(';')}}`;

export const baseCss =
  '*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;color:#111827}' +
  'h1,h2,h3,p{margin:0}img{display:block;max-width:100%}.ns-stack{display:flex}.ns-grid{display:grid}';

export function toCss(doc: Doc): string {
  const byBp = new Map<string, string[]>([['base', []], ...doc.breakpoints.map((b) => [b.id, []] as [string, string[]])]);
  const walk = (n: Node) => {
    for (const [bp, d] of Object.entries(n.style ?? {})) byBp.get(bp)?.push(rule(n.id, d));
    n.children?.forEach(walk);
  };
  walk(doc.root);
  const media = [...doc.breakpoints]
    .sort((a, b) => b.maxWidth - a.maxWidth)
    .map((b) => `@media (max-width:${b.maxWidth}px){${byBp.get(b.id)!.join('')}}`);
  return baseCss + byBp.get('base')!.join('') + media.join('');
}
