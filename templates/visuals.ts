// Generated visuals of the built-in templates: original, deterministic SVG (no photo, no external
// reference), so the templates are free of rights. They pass the Studio's SVG policy (checkSvg).

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

/** Deterministic pseudo-random numbers from a seed. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Soft luminous orbs on a dark background (radial gradients, no filter). */
export function orbs(w: number, h: number, bg: string, colors: string[], seed = 1) {
  const r = rng(seed);
  const defs = colors
    .map(
      (c, i) =>
        `<radialGradient id="o${i}"><stop offset="0" stop-color="${c}" stop-opacity=".85"/><stop offset=".55" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`,
    )
    .join('');
  const circles = colors
    .map((_, i) => {
      const cx = Math.round(w * (0.15 + r() * 0.7));
      const cy = Math.round(h * (0.1 + r() * 0.8));
      const rad = Math.round(Math.min(w, h) * (0.35 + r() * 0.3));
      return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#o${i})"/>`;
    })
    .join('');
  return svg(w, h, `<defs>${defs}</defs><rect width="${w}" height="${h}" fill="${bg}"/>${circles}`);
}

/** Abstract project cover: a gradient field, geometric shapes and a fine grid. */
export function cover(w: number, h: number, from: string, to: string, ink: string, seed: number) {
  const r = rng(seed);
  const shapes: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x = Math.round(r() * w);
    const y = Math.round(r() * h);
    const s = Math.round(80 + r() * 320);
    const kind = Math.floor(r() * 3);
    const op = (0.25 + r() * 0.55).toFixed(2);
    if (kind === 0)
      shapes.push(`<circle cx="${x}" cy="${y}" r="${s / 2}" fill="${ink}" fill-opacity="${op}"/>`);
    else if (kind === 1)
      shapes.push(
        `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="${Math.round(s / 6)}" fill="${ink}" fill-opacity="${op}" transform="rotate(${Math.round(r() * 90)} ${x} ${y})"/>`,
      );
    else
      shapes.push(
        `<path d="M${x - s} ${y} A${s} ${s} 0 0 1 ${x + s} ${y}" fill="none" stroke="${ink}" stroke-opacity="${op}" stroke-width="${Math.round(12 + r() * 30)}"/>`,
      );
  }
  const grid = Array.from({ length: Math.floor(w / 80) }, (_, i) => `M${(i + 1) * 80} 0V${h}`).join('');
  return svg(
    w,
    h,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><path d="${grid}" stroke="${ink}" stroke-opacity=".08"/>${shapes.join('')}`,
  );
}

/** Fictional brand wordmark for a client logo band (generic font, no trademark). */
export function wordmark(
  text: string,
  color: string,
  mark: 'circle' | 'square' | 'triangle',
  italic = false,
) {
  const shape =
    mark === 'circle'
      ? `<circle cx="34" cy="40" r="18" fill="none" stroke="${color}" stroke-width="6"/>`
      : mark === 'square'
        ? `<rect x="16" y="22" width="36" height="36" rx="6" fill="${color}"/>`
        : `<path d="M34 20 54 58H14Z" fill="${color}"/>`;
  return svg(
    320,
    80,
    `${shape}<text x="70" y="53" font-family="system-ui, sans-serif" font-size="30" font-weight="700" letter-spacing="1" fill="${color}"${italic ? ' font-style="italic"' : ''}>${text}</text>`,
  );
}

/** Stylised portrait: background, shoulders and head in flat shapes, from a seed. */
export function portrait(
  w: number,
  h: number,
  bg: string,
  skin: string,
  cloth: string,
  hair: string,
  seed: number,
) {
  const r = rng(seed);
  const hx = w / 2;
  const hy = h * 0.4;
  const hr = w * 0.17;
  const hairShape =
    r() > 0.5
      ? `<path d="M${hx - hr * 1.1} ${hy} Q${hx} ${hy - hr * 2.2} ${hx + hr * 1.1} ${hy} Q${hx + hr * 0.6} ${hy - hr * 0.6} ${hx - hr * 1.1} ${hy}Z" fill="${hair}"/>`
      : `<path d="M${hx - hr * 1.15} ${hy + hr * 0.9} Q${hx - hr * 1.4} ${hy - hr * 1.6} ${hx} ${hy - hr * 1.25} Q${hx + hr * 1.4} ${hy - hr * 1.6} ${hx + hr * 1.15} ${hy + hr * 0.9} Q${hx + hr * 0.9} ${hy - hr * 0.4} ${hx} ${hy - hr * 0.7} Q${hx - hr * 0.9} ${hy - hr * 0.4} ${hx - hr * 1.15} ${hy + hr * 0.9}Z" fill="${hair}"/>`;
  return svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/><path d="M${w * 0.12} ${h} Q${w * 0.14} ${h * 0.66} ${hx} ${h * 0.64} Q${w * 0.86} ${h * 0.66} ${w * 0.88} ${h}Z" fill="${cloth}"/><rect x="${hx - hr * 0.42}" y="${hy + hr * 0.6}" width="${hr * 0.84}" height="${hr * 0.9}" fill="${skin}"/><circle cx="${hx}" cy="${hy}" r="${hr}" fill="${skin}"/>${hairShape}`,
  );
}

/** Architectural elevation in fine lines: a facade with a grid of windows and a portico. */
export function facade(w: number, h: number, bg: string, line: string, accent: string) {
  const fx = w * 0.18;
  const fw = w * 0.64;
  const top = h * 0.16;
  const base = h * 0.9;
  const cols = 5;
  const rows = 4;
  const cw = fw / cols;
  const rh = (base - top - h * 0.18) / rows;
  let windows = '';
  for (let c = 0; c < cols; c++)
    for (let rr = 0; rr < rows; rr++)
      windows += `<rect x="${fx + c * cw + cw * 0.22}" y="${top + h * 0.06 + rr * rh + rh * 0.18}" width="${cw * 0.56}" height="${rh * 0.62}" rx="${cw * 0.28}" fill="none" stroke="${line}" stroke-width="2"/>`;
  return svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/><circle cx="${w * 0.78}" cy="${h * 0.2}" r="${w * 0.09}" fill="${accent}" fill-opacity=".85"/><path d="M${fx - 20} ${top}H${fx + fw + 20}M${fx} ${top}V${base}M${fx + fw} ${top}V${base}M${w * 0.06} ${base}H${w * 0.94}" stroke="${line}" stroke-width="3" fill="none"/>${windows}<path d="M${fx + fw * 0.4} ${base}V${base - h * 0.14}H${fx + fw * 0.6}V${base}" fill="none" stroke="${accent}" stroke-width="3"/>`,
  );
}

/** Discreet line pattern for a background (diagonals). */
export function lines(w: number, h: number, bg: string, line: string) {
  const step = 36;
  const d = Array.from(
    { length: Math.ceil((w + h) / step) },
    (_, i) => `M${i * step} 0L${i * step - h} ${h}`,
  ).join('');
  return svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/><path d="${d}" stroke="${line}" stroke-width="1.5"/>`,
  );
}
