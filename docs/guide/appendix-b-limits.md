---
title: "Appendix B. Current limits and workarounds"
---

The Studio is young: some features of page builders do not exist yet, others are deliberately absent. This appendix lists what you will run into, with the workaround when there is one. The **deliberate** absences (arbitrary HTML, plugins…) are explained in [appendix A](appendix-a-equivalences.md).

## Editing

| Limit | Workaround |
|---|---|
| No multiple selection | Group the elements in a box, then act on the box |
| Copy and paste only works inside the Studio, within one project | Between projects: a site template, or the project archive |
| Links in rich text are entered in a small browser window | — |
| No subheading or list inside a text | A **Heading** or **List** component between two **Text**s |
| No size, background or gradient on part of a text (only bold, italic, color, link) | Split into several elements, or apply the setting to the whole element |
| A color chosen in the text does not follow changes of the design system | For a whole element, use the inspector's **Text color** |
| The canvas does not display animations by default | Tick **Play animations in the canvas**, or use the **Site preview** |
| No history between two sessions: undo and the log start from zero when reopening | Before a big change, export the project archive (**⋯** menu) |
| No automatic saving | <kbd>⌘</kbd> <kbd>S</kbd> regularly; the Studio warns if you close the tab without saving |
| Interface languages: English and French only | Another language is added with a translation file (see the repository's CONTRIBUTING) |

## Components and styling

| Limit | Workaround |
|---|---|
| The **form** sends no email itself, stores no answers, and accepts no attachment | A form service (Formspree, Web3Forms…) or the host's script receives the data; for richer forms, a hosted form (Tally, Typeform…) |
| Carousel: images only, no composed slide (heading, text, button) | A grid of cards, or a gallery |
| Video: YouTube or Vimeo only | Host the video on one of these platforms |
| About twenty icons | An SVG image from the media library |
| Navigation: one submenu level | Group the pages, or create a section page |
| A closed accordion is not edited in the canvas | Tick **Open on load** while editing it, or go through the layers |
| A border applies to all four sides at once | For a line on one side only: a **Divider** component |
| One shadow and one background image per element | Nest two boxes |
| Screen sizes (breakpoints) cannot be changed | Desktop, Tablet (up to 1023 px), Mobile (up to 767 px) cover the essentials |
| No color contrast check | An online tool, such as WebAIM's *Contrast Checker* |

## Media and fonts

| Limit | Workaround |
|---|---|
| No folders in the media library | **Tags** and search |
| No replacing a file with a new version | Import the new version, choose it in the elements, remove the old one |
| No automatic cleanup of unused media | Spot the "unused" indication and remove them |
| Background images are not optimized at export | Prepare them: 1920 px wide at most, under 500 KB |
| Fonts: WOFF2 only, catalog in the Latin character set | Convert a TTF or OTF font to WOFF2 (if its license allows it); for another script, import a file that covers it |

## Site and team

| Limit | Workaround |
|---|---|
| A single header and a single footer | Hide them on a page and build its own there |
| No accounts or rights: the whole team has every right | Organize yourselves: one project, one person at a time |
| Two people on the same project: the second to save is warned of a conflict | Reload the page to start again from the saved version, or choose to overwrite |
| A deleted project is moved to the server's trash and cannot be restored from the interface | Ask the administrator to recover it |

## Export and publishing

| Limit | Workaround |
|---|---|
| The static site is built on the Studio's server, in one to a few minutes, without a progress bar | Wait without closing the export window |
| The export window does not keep the list of previous exports | Download the archives as soon as the export ends |
| The archives are `.tar.gz`, not `.zip` | macOS and Windows 11 open them; otherwise 7-Zip |
| No automatic publishing to a host | Manual upload of the files (chapter [Publish and deliver](11-publish-and-deliver.md)) |
| Sources changed by hand by a developer cannot be imported back | Decide who evolves the site: the Studio or the code |

Is a limit often in your way? Report it: that is how the next changes are decided.
