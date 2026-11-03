// Comparison helpers shared by the fidelity bench and the milestone demo.
import { createRequire } from 'node:module';
import type { Page } from 'playwright';

export type Snapshot = { html: string; elements: { key: string; style: string; box: string }[] };
/** Works on a page or a frame (the canvas iframe). */
export const snapshot = (page: Pick<Page, 'evaluate'>): Promise<Snapshot> =>
  page.evaluate(() => {
    const root = document.getElementById('ns-root');
    if (!root) throw new Error('#ns-root missing');
    // Attribute order is not meaningful (React's client sets <img src> last). Raster images are
    // optimized at export (ADR-0010): their src is compared by media id, srcset/sizes are export-only.
    // Inline styles (run colors, ADR-0020) are compared as the browser normalizes them.
    const attr = (el: Element, a: Attr) =>
      a.name === 'style'
        ? ` style="${(el as HTMLElement).style.cssText}"`
        : // Gallery zoom links point to the optimized image at export (ADR-0021): compared by media id.
          a.name === 'href' && el.classList.contains('ns-gallery-link')
          ? ` href="${a.value.split('/').pop()?.split('.')[0]}"`
          : el.tagName !== 'IMG'
            ? ` ${a.name}="${a.value}"`
            : a.name === 'srcset' || a.name === 'sizes'
              ? ''
              : a.name === 'src'
                ? ` src="${a.value.split('/').pop()?.split('.')[0]}"`
                : ` ${a.name}="${a.value}"`;
    const ser = (n: Node): string =>
      n instanceof Element
        ? `<${n.tagName}${[...n.attributes]
            .map((a) => attr(n, a))
            .sort()
            .join('')}>${[...n.childNodes].map(ser).join('')}</${n.tagName}>`
        : (n.textContent ?? '');
    return {
      html: ser(root),
      elements: [root, ...root.querySelectorAll('*')].map((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          key: `${el.tagName}.${el.className}`,
          // Background images (ADR-0017) resolve against each server's origin: compared by path.
          style: [...cs]
            .map((k) => `${k}:${cs.getPropertyValue(k)}`)
            .join(';')
            .replaceAll(`url("${location.origin}/`, 'url("/'),
          box: [r.x, r.y, r.width, r.height].map((v) => v.toFixed(2)).join(','),
        };
      }),
    };
  });

/** Full-page screenshot with images masked: their pixels come from different files (ADR-0010), their boxes are compared by `diffStyles`. */
export const shot = (page: Page) =>
  page.screenshot({ fullPage: true, mask: [page.locator('img')], maskColor: '#ff00ff' });

export const imagesLoaded = (page: Pick<Page, 'evaluate'>) =>
  page.evaluate(() =>
    Promise.all(
      // A lazy image out of view (a carousel slide) may never load: waited for 3 s at most. Images are masked
      // in screenshots and their boxes come from their width/height attributes.
      [...document.images].map((img) =>
        img.complete
          ? img.decode().catch(() => {})
          : Promise.race([
              new Promise((ok) => img.addEventListener('load', ok)).then(() => img.decode()),
              ...(img.loading === 'lazy' ? [new Promise((ok) => setTimeout(ok, 3000))] : []),
            ]),
      ),
    ),
  );

/** Families of the web fonts loaded once the page settled (ADR-0018), sorted and deduplicated. */
export const loadedFonts = (page: Pick<Page, 'evaluate'>) =>
  page.evaluate(() =>
    document.fonts.ready.then(() =>
      [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))].sort(),
    ),
  );

export function diffStyles(a: Snapshot, b: Snapshot): string[] {
  const out: string[] = [];
  a.elements.forEach((ea, i) => {
    const eb = b.elements[i];
    if (!eb || ea.key !== eb.key) {
      out.push(`${ea.key}: élément absent ou différent`);
      return;
    }
    if (ea.box !== eb.box) out.push(`${ea.key}: boîte ${ea.box} ≠ ${eb.box}`);
    if (ea.style !== eb.style) {
      const sb = new Set(eb.style.split(';'));
      out.push(
        `${ea.key}: ${ea.style
          .split(';')
          .filter((d) => !sb.has(d))
          .slice(0, 3)
          .join(' | ')}`,
      );
    }
  });
  if (a.elements.length !== b.elements.length)
    out.push(`${a.elements.length} ≠ ${b.elements.length} éléments`);
  return out;
}

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/** axe-core audit (WCAG 2.1 A/AA rules) of the current page; returns serious/critical violations. */
export async function accessibility(page: Page) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            ctx: Document,
            o: object,
          ) => Promise<{
            violations: {
              id: string;
              impact: string;
              nodes: { html: string; any?: { data?: unknown }[] }[];
            }[];
          }>;
        };
      }
    ).axe;
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      count: v.nodes.length,
      sample: (v.nodes as { html: string; any?: { data?: unknown }[] }[])
        .slice(0, 2)
        .map((n) => `${n.html.slice(0, 80)} ${JSON.stringify(n.any?.[0]?.data ?? '')}`),
    }));
  });
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}
