// Tabs island (SB-07): ARIA tabs on top of the server-rendered panels. Idempotent: safe to run again
// after a re-render (the Studio canvas does), the selected tab is kept.
const ready = new WeakSet<Element>();

export function init(root: ParentNode = document) {
  for (const tabs of root.querySelectorAll<HTMLElement>('[data-ns-tabs]')) {
    const list = tabs.querySelector<HTMLElement>(':scope > [role="tablist"]');
    if (!list) continue;
    const buttons = () => [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const select = (index: number, focus: boolean) => {
      buttons().forEach((button, i) => {
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
        const panel = tabs.querySelector<HTMLElement>(
          `#${CSS.escape(button.getAttribute('aria-controls') ?? '')}`,
        );
        if (!panel) return;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', button.id);
        panel.tabIndex = 0;
        panel.hidden = i !== index;
      });
      if (focus) buttons()[index]?.focus();
    };
    tabs.classList.add('ns-tabs-js');
    list.hidden = false;
    select(
      Math.max(
        0,
        buttons().findIndex((b) => b.getAttribute('aria-selected') === 'true'),
      ),
      false,
    );
    if (ready.has(tabs)) continue;
    ready.add(tabs);
    list.addEventListener('click', (event) => {
      const index = buttons().indexOf(
        (event.target as Element).closest<HTMLButtonElement>('[role="tab"]') as HTMLButtonElement,
      );
      if (index >= 0) select(index, true);
    });
    list.addEventListener('keydown', (event) => {
      const all = buttons();
      const current = all.indexOf(document.activeElement as HTMLButtonElement);
      const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: all.length - 1 }[
        event.key
      ];
      if (next === undefined || current < 0) return;
      event.preventDefault();
      select((next + all.length) % all.length, true);
    });
  }
}
