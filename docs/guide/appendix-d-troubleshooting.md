---
title: "Appendix D. Troubleshooting, FAQ and glossary"
---

## Troubleshooting

**A "Refused: …" message appears at the bottom of the screen.**
The requested action is not possible: an element cannot go to that place (a heading in an accordion, for instance), a value is out of bounds, a media file or a color is still in use. The message says why; nothing was changed.

**"Failed" when saving, with an "Overwrite the server version" button.**
Someone else saved this project since you opened it. **Overwrite** replaces their version with yours; otherwise, note your changes, reload the page and redo them on the up-to-date version.

**My heading does not change size on mobile.**
Check the breakpoint shown in the toolbar: a value set on Desktop applies everywhere, unless a Tablet or Mobile value replaces it (filled dot in front of the setting). The circular arrow resets it.

**I cannot find an element in the canvas.**
It may be hidden at this breakpoint, empty or without a background: go through the **layers**.

**A link or a button does not react to clicks.**
That is normal in the canvas, where a click selects. Test the navigation in the **Site preview**.

**My font does not show.**
Check that the font is imported (media library, "Font") and that its name comes **first** in the design system font, written exactly like the family of the media file (`Inter, sans-serif`). Then that the element uses this font, directly or through its text style.

**My project CSS rule does not apply.**
Read the messages under the editor: as long as an **error** remains, the last valid version applies. Then check that the element carries the class (inspector, Advanced section, **CSS classes**) and that the selector writes it with a dot (`.raised-card`). **Warnings** prevent nothing.

**The export is refused ("blocking errors").**
Click each error to go to the element concerned: most often a link to an unpublished page or a missing media file.

**The online site does not show my latest changes.**
Check that you saved, exported **again**, then replaced **all** the files at the host. Clear the browser cache (<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>R</kbd>).

**The pages show online, but not the 404 page, or the redirects do not work.**
They need a configuration of the host (chapter [Publish and deliver](11-publish-and-deliver.md)).

**Images or styles are missing online.**
The site must be at the **root** of the domain, and it is **the content** of the exported folder that must be copied, not the folder itself.

**The interface is in the wrong language.**
The **language** button of the toolbar (or of the Projects screen) changes it; the choice is remembered by your browser. The language of the site itself is a separate setting (inspector, Site section).

## Frequently asked questions

**Can I import a WordPress, Tatsu or Elementor site?**
No. Rebuild it in the Studio, starting from a template; it is often the opportunity to simplify it.

**Can the client change their site themselves?**
Not yet: the Studio is for the team. Changes go through you, then through a new export.

**Where are the sites hosted?**
Wherever you want: the Studio produces files, to upload to any host (chapter [Publish and deliver](11-publish-and-deliver.md)).

**Are my projects backed up?**
On the Studio's server, on each save. For a copy of your own, export the **project archive** (**⋯** menu).

**Can I use a font bought by the client?**
If its license allows use on the web: import its WOFF2 file (chapter [The design system](05-design-system.md)).

**Does the AI assistant see the whole site?**
No: only the selection (or the page), its structure and its texts (chapter [The AI assistant](10-ai-assistant.md)).

**Does the exported site depend on Netvolution?**
No. It works alone, without the Studio or any Netvolution service; its sources are a standard Astro project.

## Glossary

| Term | Definition |
|---|---|
| **Astro** | The standard tool that builds the site from the exported sources |
| **Breakpoint** | A screen size from which settings change: Desktop (base), Tablet, Mobile |
| **Canvas** | The central area, where the page shows as it will be published |
| **Component** | An element of the library: heading, text, image, stack… |
| **Composition** | A ready-made structure of boxes and components, to insert |
| **Container, Stack, Grid** | The three layout boxes: a simple block, Flexbox (row or column), equal columns |
| **CSS class** | A name given to an element (inspector, Advanced), targeted by the project stylesheet |
| **Design system** | The colors, sizes, fonts, text styles and stylesheet of the site |
| **Export** | Producing the site's files (static and sources) |
| **Gap** | The spacing between the elements of a stack or a grid |
| **Header, Footer** | The top and bottom of the page, shared by the pages |
| **Inspector** | The right panel, which sets the selected element or the page |
| **Instance** | A placed copy of a reusable component |
| **Layers** | The structure of the page, as a tree, on the left |
| **Margin, Padding** | The space around an element, and the space between its edge and its content |
| **Media library** | The images, SVGs, fonts and files of the project |
| **Meta description** | The summary of a page shown by search engines |
| **Open Graph** | The image and text shown when a page is shared on social networks |
| **301 redirect** | The permanent forwarding of an old address to a new one |
| **Reduced motion** | A setting of the visitor's system that asks for fewer animations |
| **Reusable component** | A section designed once, placed as several linked **instances** |
| **Site template** | A complete project used as a starting point |
| **Sitemap** | The list of the site's pages, for search engines |
| **Slug** | The end of a page's address: `pricing` in `/pricing/` |
| **Static site** | Ready-to-use HTML pages, without a database or an application server |
| **Alternative text** | The description of an image, read by screen readers |
| **Token** | A named value of the design system ("Primary", "Section") |
| **WOFF2** | The file format of fonts for the web |
