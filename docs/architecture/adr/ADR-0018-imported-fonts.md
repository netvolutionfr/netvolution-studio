# ADR-0018 — Imported fonts and catalog of free fonts

**Status:** Accepted on 10/31/2026 · **Date:** 10/31/2026 · **Ref.:** CLAUDE §6, §8 and §9, ADR-0009, ADR-0010

## Context

The design system (ADR-0009) only knew lists of families: only the fonts installed on the visitor's machine were displayed. Designers need the fonts of the brand guidelines.

We reject the usual solution of page builders, which load fonts from Google Fonts. That loading sends each visitor's IP address to Google, in the United States. Since the Schrems II ruling (CJEU, 2020) and the decision of the Munich court (LG München, 01/20/2022), it is a GDPR risk for clients. The site must also stay standalone (CLAUDE §6): no third-party service at runtime.

The user's decisions on 10/31/2026: **imported fonts rather than web fonts**, **woff2 only**, and a **catalog of the most widespread fonts** offered in the Studio.

## Decision

1. **A new media type: `font`.** woff2 file only, 2 MB maximum. The server checks the `wOF2` signature. Each font describes:
   - its `family` (same naming rule as the stacks of the design system, hence safe inside a CSS string);
   - its `weight`, `{ min, max }`: a single value, or a range for a variable font;
   - its `style`, `normal` or `italic`;
   - an optional `license`.

   On import, the description is inferred from the file name (`Inter-SemiBoldItalic.woff2`) and can be corrected in the media library.
2. **Declaration.** `toCss` emits one `@font-face` per file, with `font-display: swap`, under the media prefix. The canvas and the preview serve the files from the project; the export copies them into `public/media/`. Thumbnails emit none.
3. **Use.** An imported font is used by putting its family at the head of a design system stack (`Inter, sans-serif`). The model does not link a stack to a media file: a family name is enough, and a missing family falls back to the next font of the stack.
4. **Catalog.** 25 free, widespread fonts, under the SIL OFL 1.1 license (Apache 2.0 for Roboto Slab), are versioned in `fonts/`:
   - the Latin character set only, which covers French;
   - 23 variable fonts (one file per style), plus Lato and Poppins in fixed weights;
   - their complete license;
   - in total, 49 files and 1.9 MB.

   They are produced by `npm run fonts:catalog` from the Fontsource packages, in pinned versions. The Studio calls no font service, neither while editing nor in the produced site.
5. **Adding from the catalog.** One click copies the files into the project's media (`POST /api/projects/:id/fonts`) and creates a design system font, `Family, serif` or `Family, sans-serif`. Everything is undone in a single step.
6. **Licenses.** The license of a catalog font is recorded on the media file and repeated in the export's `MEDIA.md`. For a font imported by hand, the user guarantees that its license allows web use: the guide reminds them.

## Rejected alternatives

- **Google Fonts or Adobe Fonts online**: transfer of personal data outside the EU, and dependency on a third-party service at runtime.
- **TTF, OTF and WOFF**: heavier, or outdated. TTF and OTF files are often sold under a "desktop" license, which excludes web use. woff2 is read by every current browser.
- **A catalog downloaded on demand**: the Studio would depend on a registry on every addition. A versioned copy is more stable and verifiable.
- **Linking a design system stack to a media file**: stronger coupling, without benefit. The family name is enough, and the user keeps control of the fallback fonts.

## Consequences

- The fidelity bench covers an imported font: the `tokens` fixture uses Lora, and the bench checks that the font is really loaded on the canvas side as on the export side, not replaced by a system font.
- The check before export reports a missing font file as an error.
- The Docker image embeds the catalog (`fonts/catalog.json`, `fonts/files/`).
- The guide (chapters 5 and 7) explains the catalog, importing and the license question.
