// Gallery island (ADR-0021): opens an image at full size in a modal dialog, with previous/next
// buttons, arrow keys, Escape and a click outside to close; focus returns to the clicked link.
// Text only through textContent and attributes: no markup is ever injected. Idempotent.
const ready = new WeakSet<Element>();

/** Labels in the site language, written by the view on the gallery. */
type Labels = { dialog?: string; close?: string; prev?: string; next?: string };

function open(links: HTMLAnchorElement[], start: number, labels: Labels) {
  const dialog = document.createElement('dialog');
  dialog.className = 'ns-lightbox';
  dialog.setAttribute('aria-label', labels.dialog ?? '');
  const figure = document.createElement('figure');
  const img = document.createElement('img');
  const caption = document.createElement('figcaption');
  const button = (label: string, className: string, text: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.setAttribute('aria-label', label);
    b.textContent = text;
    return b;
  };
  const close = button(labels.close ?? '', 'ns-lightbox-close', '×');
  const prev = button(labels.prev ?? '', 'ns-lightbox-prev', '‹');
  const next = button(labels.next ?? '', 'ns-lightbox-next', '›');
  let index = start;
  const show = (i: number) => {
    index = (i + links.length) % links.length;
    const link = links[index] as HTMLAnchorElement;
    img.src = link.href;
    img.alt = link.querySelector('img')?.alt ?? '';
    caption.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
    caption.hidden = !caption.textContent;
  };
  figure.append(img, caption);
  dialog.append(figure, close);
  if (links.length > 1) dialog.append(prev, next);
  close.addEventListener('click', () => dialog.close());
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && links.length > 1) show(index - 1);
    if (e.key === 'ArrowRight' && links.length > 1) show(index + 1);
  });
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  dialog.addEventListener('close', () => {
    dialog.remove();
    links[index]?.focus();
  });
  document.body.append(dialog);
  show(start);
  dialog.showModal();
  close.focus();
}

export function init(root: ParentNode = document) {
  for (const gallery of root.querySelectorAll<HTMLElement>('[data-ns-gallery]')) {
    if (ready.has(gallery)) continue;
    ready.add(gallery);
    const links = [...gallery.querySelectorAll<HTMLAnchorElement>('.ns-gallery-link')];
    for (const [i, link] of links.entries()) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        open(links, i, gallery.dataset);
      });
    }
  }
}
