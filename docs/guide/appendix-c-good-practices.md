---
title: "Appendix C. Good practices"
---

The Studio guarantees clean code, light pages and basic accessibility. The rest depends on your choices: this appendix gathers those that matter most.

## Accessibility

An accessible site is usable with the keyboard, with a screen reader, zoomed in, by older people or people with disabilities. It is also a legal obligation for many sites, and an asset for search engines.

- **One H1 heading per page, then H2, H3 in order**, without skipping a level. The level gives the structure; the size is set in the style. The pre-export checks report the gaps.
- **A useful alternative text** for each image that carries meaning; **Decorative image** for the others (chapter [Media](07-media.md)).
- **Contrast**: at least 4.5:1 between body text and its background, 3:1 for a large heading. Beware of light texts on photos: add a veil (gradient).
- **Explicit links**: "See our prices" rather than "Click here". Several "Learn more" on a page are hard to tell apart for a screen reader: prefer "Discover our advice", "Discover our creation"…
- **No information carried by color alone** ("the fields in red") or by position alone ("the button on the right").
- **The keyboard**: go through the page with <kbd>Tab</kbd> in the Site preview; each link and button must show where you are.
- **The site's language** (inspector, Site section): it lets screen readers pronounce correctly.
- **Sober animations**, and an effect on keyboard focus when there is one on hover (chapter [Animations](09-animations.md)).
- **No hidden content** on mobile if it is useful: everyone must be able to reach it.

The Studio automatically checks part of these rules (with the axe tool); a human review is still needed.

## Search engines (SEO)

- **An SEO title and a meta description per page**, unique, that make people want to click (chapter [The site](06-the-site.md)).
- **Short, meaningful addresses**: `/pricing/`, `/services/website-design/`. Do not change them once the site is online, or add a redirect.
- **The site's canonical URL** filled in: it enables the sitemap.
- **Headings that use the words your clients search for** ("Showcase website design in Bristol"), without keyword stuffing.
- **A sharing image** (1200 × 630 px) for the pages that will be shared on social networks.
- During a redesign, **redirects** from the old addresses to the new ones, so as not to lose the ranking already gained.

## Performance

The Studio's sites start with an advantage (static HTML, no WordPress, very little JavaScript). To keep it:

- **Images**: import a single version large enough (1600 px for full width), the Studio does the rest. Set the main image at the top of the page to **Immediate** loading, the others to **Deferred**.
- **Background images**: prepared by hand, under 500 KB, as they are not optimized.
- **Fonts**: two families at most, and only the styles used. A variable font of the catalog covers every weight in one file.
- **Animations and interactive components**: each adds a little JavaScript to the page; only use them where they serve.
- **Videos**: a YouTube or Vimeo video is heavy; prefer one per page.

## Responsive

- Design on **Desktop** first, then correct on **Tablet** and **Mobile**: on a small screen, only set what changes.
- Prefer **spacing (gap)**, **max. widths** and grids to fixed sizes in pixels: they adapt by themselves.
- Check each page at 390 px, then at intermediate widths (600, 900 px) with the "px" field.
- Buttons and links large enough on mobile: about 44 px high, with enough room between them.

## Organization

- **Name** your sections in the layers ("Hero", "Pricing", "Contact"): you and your colleagues will find your way.
- **The design system first**, the pages next (chapter [The design system](05-design-system.md)).
- **A reusable component** for any block repeated on several pages.
- **Project CSS as a last resort**: an inspector setting stays simpler to take over. Name classes by their role (`raised-card`, not `blue-left`), target your own classes rather than the `ns-…` classes, and add a `prefers-reduced-motion` rule to any animation.
- **Save often**, and export the **project archive** before a major redesign.
- **One project, one person at a time.**
