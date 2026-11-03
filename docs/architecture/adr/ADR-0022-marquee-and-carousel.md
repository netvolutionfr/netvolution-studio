# ADR-0022 — Marquee and carousel

**Status:** Accepted on 11/01/2026 · **Date:** 11/01/2026 · **Ref.:** CLAUDE §6, §8 and §9, ADR-0002 (islands), ADR-0010, ADR-0021, `docs/history/research/essai-import-tatsu.md`

## Context

The trial Tatsu site has 52 marquees (logos, keywords) and 4 image carousels. The converter rendered them as a fixed row of images or as a gallery. Both patterns raise accessibility questions: a movement longer than five seconds must be pausable (WCAG 2.2.2), and a carousel must stay usable with the keyboard and without JavaScript.

## Decision

1. **A Marquee component** (`marquee`): rich texts (with a separator) or media library images, image height, spacing, duration of one loop, direction.
   - Scrolling is **a CSS animation** (`translateX(-50%)` on a track containing the content twice). The copy is hidden from assistive technologies (`aria-hidden`, empty alternative texts).
   - It stops on hover and focus. An island shows a **Pause** / **Resume scrolling** button (`aria-pressed`).
   - With `prefers-reduced-motion`, nothing moves: the content wraps, the copy and the button are hidden.
2. **A Carousel component** (`carousel`), images only: accessible name, ratio, number of visible images per breakpoint (`--ns-per-view`), spacing, optional autoplay and interval.
   - The track is a **horizontal grid with `scroll-snap`**: without JavaScript, it scrolls with a finger, the scroll bar and the arrow keys (it is focusable).
   - An island shows the previous and next buttons (looping at the ends) and, when enabled, autoplay. Autoplay stops on hover, on focus and with the **Pause** button, and never starts with `prefers-reduced-motion`.
   - Semantics of the APG "carousel" pattern: a `section` with `aria-roledescription`, slides `role="group"` named "n of N".
   - Since ADR-0024, these generated texts follow the site language.
3. **The canvas runs both islands** (`canvasIslands`), so that its DOM matches the export; the carousel runs there without autoplay.
4. Both components reuse the "media list" field (ADR-0021): validation, usages and WebP variants at export.

## Rejected alternatives

- **A carousel library** (Swiper, Splide, Embla): a dependency and JavaScript for what `scroll-snap` does natively.
- **A fully JavaScript marquee** (`requestAnimationFrame`): more code, without a visible gain.
- **Composed slides** (heading, text, button): they need free children and another editing model. Postponed until a real need.

## Consequences

- Fidelity bench: the `composition` fixture contains a marquee and a carousel. On the export, the bench checks scrolling, pause, reduced motion and the carousel buttons.
- The Tatsu converter produced marquees in image mode and carousels.
- The guide documents both components (chapters 3 and 7, appendices A and B).
