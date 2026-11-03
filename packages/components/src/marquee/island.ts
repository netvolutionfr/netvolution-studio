// Marquee island (ADR-0022): shows the pause button (WCAG 2.2.2) and toggles the animation.
// The animation itself is CSS; nothing happens with reduced motion (the band stands still).
// Idempotent: safe to run again after a re-render (the Studio canvas does).
const ready = new WeakSet<Element>();

export function init(root: ParentNode = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const band of root.querySelectorAll<HTMLElement>('[data-ns-marquee]')) {
    if (ready.has(band)) continue;
    ready.add(band);
    const toggle = band.querySelector<HTMLButtonElement>('.ns-marquee-toggle');
    if (!toggle) continue;
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const paused = band.classList.toggle('ns-marquee-paused');
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? 'Reprendre le défilement' : 'Mettre en pause';
    });
  }
}
