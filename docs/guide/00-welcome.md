---
title: "0. Welcome"
---

Netvolution Studio is a tool to design showcase websites visually, as with Tatsu or Elementor, then publish them as **static sites**: ready-to-use HTML pages, fast and secure, that work without the Studio or WordPress.

## What does not change

You’ll find the page builder features you’re already familiar with:

- a **library** of elements to drag into the page;
- a **canvas** that shows the page as it will be published;
- an **inspector** to set the content, colors, spacing and layout of the selected element;
- the page's **layers** (Elementor's "Navigator");
- **desktop, tablet and mobile** previews, with settings specific to each screen size;
- **global colors and fonts**, a shared **header** and **footer**, **reusable sections** and **site templates**.

## What changes

> **There is no "live" site in the Studio.** The Studio is a workshop. When the site is ready, you **export** it: the Studio produces the site's files, which are then uploaded to any host. Changing the site means changing it in the Studio, then exporting again.

- **No WordPress, no plugins.** The published pages contain neither a database nor a back office: nothing to update, nothing to hack.
- **No arbitrary HTML or JavaScript.** There is no "HTML" widget and no shortcode: everything goes through the components and the inspector's settings. That is what guarantees valid, accessible pages, identical between the Studio and the published site. For an effect the inspector does not offer, the designer can write a **project stylesheet**, checked by the Studio (chapter [The design system](05-design-system.md)).
- **A freer structure.** No imposed Section > Row > Column: you nest **containers**, **stacks** (Flexbox) and **grids** (CSS Grid). Ready-made compositions ("Row, 2 columns", "Hero"…) give the usual layouts in one click.
- **Text is edited in the inspector**, not directly on the page. Click the text in the canvas, then change it on the right.
- **The code produced belongs to the client.** The export is a standard, documented [Astro](https://astro.build) project: a developer can take it over without the Studio.

## Signing in

The Studio runs at the address your administrator gives you, protected by a username and a password for each team member. It works in recent browsers, on a computer screen. Its interface follows your browser's language (English or French); the **language** button of the toolbar changes it.

Once signed in, the whole team shares the same projects: there are no accounts or different rights yet. Avoid editing the same project at the same time: the second person to save is warned of a conflict and must choose which version to keep.

## What next?

The easiest way is to follow the [getting started tutorial](01-getting-started.md): in twenty minutes, you will have created, changed and exported a complete site.
