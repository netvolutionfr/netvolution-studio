// Carousel island (ADR-0022): previous/next buttons on the scroll-snapped track (looping at the
// ends) and, when enabled, an autoplay paused on hover, focus or the pause button, never with
// reduced motion. Idempotent; the Studio canvas runs it without autoplay.
const ready = new WeakSet<Element>();

export function init(root: ParentNode = document, options: { autoplay?: boolean } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const carousel of root.querySelectorAll<HTMLElement>('[data-ns-carousel]')) {
    if (ready.has(carousel)) continue;
    ready.add(carousel);
    const track = carousel.querySelector<HTMLElement>('.ns-carousel-track');
    const controls = carousel.querySelector<HTMLElement>('.ns-carousel-controls');
    if (!track || !controls) continue;
    controls.hidden = false;
    const step = () => {
      const slide = track.querySelector<HTMLElement>('.ns-carousel-slide');
      return slide
        ? slide.offsetWidth + Number.parseFloat(getComputedStyle(track).columnGap || '0')
        : track.clientWidth;
    };
    const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    const go = (direction: 1 | -1) => {
      if (direction === 1 && atEnd()) track.scrollTo({ left: 0 });
      else if (direction === -1 && track.scrollLeft <= 2) track.scrollTo({ left: track.scrollWidth });
      else track.scrollBy({ left: direction * step() });
    };
    controls.querySelector('.ns-carousel-prev')?.addEventListener('click', () => go(-1));
    controls.querySelector('.ns-carousel-next')?.addEventListener('click', () => go(1));

    const seconds = Number(carousel.dataset.autoplay);
    const pause = controls.querySelector<HTMLButtonElement>('.ns-carousel-pause');
    if (!seconds || reduced || options.autoplay === false) {
      if (pause) pause.hidden = true;
      continue;
    }
    let stopped = false;
    let hovered = false;
    setInterval(() => {
      if (!stopped && !hovered && !carousel.contains(document.activeElement)) go(1);
    }, seconds * 1000);
    carousel.addEventListener('pointerenter', () => {
      hovered = true;
    });
    carousel.addEventListener('pointerleave', () => {
      hovered = false;
    });
    pause?.addEventListener('click', () => {
      stopped = !stopped;
      pause.setAttribute('aria-pressed', String(stopped));
      pause.textContent = stopped ? 'Lecture' : 'Pause';
    });
  }
}
