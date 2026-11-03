// Compares the static export (/) with the client-rendered canvas stand-in
// (/preview/) at identical viewports: DOM, computed styles, pixels, JS.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const dist = new URL('./dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(join(dist, p));
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const exportHtml = await readFile(join(dist, 'index.html'), 'utf8');
const scripts = (exportHtml.match(/<script/g) ?? []).length;

const snapshot = (page) => page.evaluate(() => {
  const root = document.querySelector('[data-ns-root]');
  const els = [root, ...root.querySelectorAll('*')];
  // Attribute order is not meaningful (React's client sets <img src> last).
  const ser = (n) => n.nodeType === 3 ? n.data : `<${n.tagName}${[...n.attributes].map((a) => ` ${a.name}="${a.value}"`).sort().join('')}>${[...n.childNodes].map(ser).join('')}</${n.tagName}>`;
  return {
    html: ser(root),
    styles: els.map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return [el.tagName, el.className, [...cs].map((k) => `${k}:${cs.getPropertyValue(k)}`).join(';'),
        [r.x, r.y, r.width, r.height].map((n) => n.toFixed(2)).join(',')];
    }),
  };
});

const browser = await chromium.launch();
let failures = 0;
for (const width of [1280, 1024, 768, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const shots = {};
  const snaps = {};
  for (const path of ['/', '/preview/']) {
    await page.goto(base + path);
    await page.waitForSelector('[data-ns-root] .ns-c3t');
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    snaps[path] = await snapshot(page);
    shots[path] = await page.screenshot({ fullPage: true });
  }
  const a = snaps['/'], b = snaps['/preview/'];
  const html = a.html === b.html;
  const styleDiffs = a.styles.filter((s, i) => JSON.stringify(s) !== JSON.stringify(b.styles[i])).length
    + Math.abs(a.styles.length - b.styles.length);
  const pixels = shots['/'].equals(shots['/preview/']);
  if (!html || styleDiffs || !pixels) failures++;
  console.log(`${width}px  DOM identique: ${html}  éléments à style/box différent: ${styleDiffs}/${a.styles.length}  pixels identiques: ${pixels}`);
  await page.close();
}
console.log(`<script> dans l'export statique: ${scripts}`);
await browser.close();
server.close();
process.exit(failures || scripts ? 1 : 0);
