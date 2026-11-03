import { init as animate, replay as replayAnimations } from './animations/island.ts';
import { init as carousel } from './carousel/island.ts';
import { init as gallery } from './gallery/island.ts';
import { init as marquee } from './marquee/island.ts';
import { init as tabs } from './tabs/island.ts';
import { init as video } from './video/island.ts';

/** Island initializers by component type (exports load them per page; the preview runs them all). */
export const islands: Record<string, (root?: ParentNode) => void> = {
  tabs,
  video,
  gallery,
  carousel,
  marquee,
};

/**
 * Islands the canvas runs after each render: those shaping the initial markup, so the canvas DOM
 * matches the export (tabs, marquee and carousel buttons). The carousel runs without autoplay; the
 * video and gallery islands only act on click (a click selects in the editor): the canvas leaves them out.
 */
export const canvasIslands: ((root?: ParentNode) => void)[] = [
  tabs,
  marquee,
  (root) => carousel(root, { autoplay: false }),
];

/** Page-level animation island (ADR-0012), driven by the page's animation data rather than a component. */
export { animate, replayAnimations };
