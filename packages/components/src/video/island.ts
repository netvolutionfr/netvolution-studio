// Video island (SB-07): on activation of the façade link, replaces it with the provider's player.
// The player URL comes from the server-rendered `data-ns-video` attribute (built from a whitelisted id).
// Initialized elements are remembered here, not in the DOM: until a click, the markup stays exactly
// the server-rendered one (the Studio canvas, which does not run this island, renders the same).
const ready = new WeakSet<Element>();

export function init(root: ParentNode = document) {
  for (const box of root.querySelectorAll<HTMLElement>('[data-ns-video]')) {
    if (ready.has(box)) continue;
    ready.add(box);
    box.querySelector('a')?.addEventListener('click', (event) => {
      const src = box.dataset.nsVideo;
      if (
        !src?.startsWith('https://www.youtube-nocookie.com/') &&
        !src?.startsWith('https://player.vimeo.com/')
      )
        return;
      event.preventDefault();
      const player = document.createElement('iframe');
      player.src = src;
      player.title = box.querySelector('.ns-video-title')?.textContent ?? '';
      player.allow = 'autoplay; fullscreen; picture-in-picture';
      player.allowFullscreen = true;
      box.replaceChildren(player);
      player.focus();
    });
  }
}
