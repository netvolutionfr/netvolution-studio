import { type CssNode, generate, parse, walk } from 'css-tree';
import type { Asset } from '../document/schema.ts';

/**
 * Custom CSS (ADR-0023): the project stylesheet is parsed and published from the parser's output,
 * never as typed. Anything able to load an outside resource, run code or leave the `<style>` element
 * is refused; quality pitfalls are only reported.
 */

export type CssIssue = { line: number; message: string };
export type CssCheck =
  | { ok: true; css: string; assets: string[]; warnings: CssIssue[] }
  | { ok: false; errors: CssIssue[]; warnings: CssIssue[] };

/** Maximum size of the project stylesheet, in characters. */
export const CUSTOM_CSS_MAX = 65536;
/** Cascade layers: generated styles first, then the project stylesheet, which wins at any specificity. */
export const CSS_LAYERS = '@layer ns,ns-custom;';

const AT_RULES = new Set(['media', 'supports', 'container', 'keyframes']);
const PROPERTIES = new Set(['behavior', '-moz-binding']);
// Functions loading a resource from a string, or running code (old IE).
const FUNCTIONS = new Set(['expression', 'src', 'image', 'image-set', '-webkit-image-set', 'cross-fade']);
const ASSET_URL = /^ns-asset:(a[a-z0-9]{8,32})$/;
const ANIMATED = /^(?:animation|animation-name|transition)$/;

let last: { source: string; result: CssCheck } | undefined;

export function checkCustomCss(source: string): CssCheck {
  if (last?.source === source) return last.result;
  const errors: CssIssue[] = [];
  const warnings: CssIssue[] = [];
  const assets = new Set<string>();
  const lineOf = (node: CssNode) => node.loc?.start.line ?? 1;
  const ast = parse(source, {
    positions: true,
    parseCustomProperty: true,
    onParseError: (e) => errors.push({ line: (e as { line?: number }).line ?? 1, message: e.message }),
  });
  const outlines: number[] = [];
  const animations: number[] = [];
  let focusVisible = false;
  let reducedMotion = false;
  walk(ast, {
    enter(this: { atrule: { name: string } | null }, node: CssNode) {
      const line = lineOf(node);
      const named = 'name' in node && typeof node.name === 'string' ? node.name : '';
      if (named.includes('\\')) errors.push({ line, message: 'Échappement interdit dans un nom' });
      switch (node.type) {
        case 'Atrule':
          if (!AT_RULES.has(node.name.toLowerCase()))
            errors.push({
              line,
              message: `@${node.name} interdit (admis : @media, @supports, @container, @keyframes)`,
            });
          else if (node.prelude && generate(node.prelude).includes('prefers-reduced-motion'))
            reducedMotion = true;
          break;
        case 'Raw':
          errors.push({ line, message: `Syntaxe non reconnue : ${node.value.trim().slice(0, 40)}` });
          break;
        case 'Url': {
          const asset = ASSET_URL.exec(node.value);
          if (asset) assets.add(asset[1] as string);
          else
            errors.push({
              line,
              message: 'url() admis seulement vers la médiathèque : url("ns-asset:<id>")',
            });
          break;
        }
        case 'Function':
          if (FUNCTIONS.has(node.name.toLowerCase()))
            errors.push({ line, message: `${node.name}() interdit` });
          break;
        case 'String':
          if (node.value.includes('<'))
            errors.push({ line, message: 'Caractère « < » interdit dans une chaîne' });
          break;
        case 'PseudoClassSelector':
          if (node.name === 'focus-visible') focusVisible = true;
          break;
        case 'ClassSelector':
          if (node.name.startsWith('ns-'))
            warnings.push({
              line,
              message: `.${node.name} est une classe interne du Studio, susceptible de changer`,
            });
          break;
        case 'Declaration': {
          const property = node.property.toLowerCase();
          const value = generate(node.value).trim().toLowerCase();
          if (property.includes('\\'))
            errors.push({ line, message: 'Échappement interdit dans une propriété' });
          if (PROPERTIES.has(property)) errors.push({ line, message: `${node.property} interdit` });
          if (node.important) warnings.push({ line, message: '!important : à éviter' });
          if (property === 'outline' && (value === 'none' || value === '0')) outlines.push(line);
          if (ANIMATED.test(property) && value !== 'none') animations.push(line);
          const inMedia = this.atrule?.name.toLowerCase() === 'media';
          if (
            !inMedia &&
            ((property === 'display' && value === 'none') ||
              (property === 'visibility' && value === 'hidden'))
          )
            warnings.push({ line, message: `${property}: ${value} masque le contenu à tous les visiteurs` });
          break;
        }
      }
    },
  });
  if (!focusVisible)
    for (const line of outlines)
      warnings.push({
        line,
        message: 'outline supprimé sans règle :focus-visible : le focus clavier devient invisible',
      });
  if (!reducedMotion)
    for (const line of animations)
      warnings.push({ line, message: 'Animation sans règle @media (prefers-reduced-motion: reduce)' });
  const byLine = (a: CssIssue, b: CssIssue) => a.line - b.line;
  warnings.sort(byLine);
  const result: CssCheck = errors.length
    ? { ok: false, errors: errors.sort(byLine), warnings }
    : { ok: true, css: generate(ast), assets: [...assets], warnings };
  last = { source, result };
  return result;
}

/** Media used by a project stylesheet (usage count, export copy); none when it is invalid. */
export const customCssAssets = (source: string | undefined): string[] => {
  if (!source) return [];
  const r = checkCustomCss(source);
  return r.ok ? r.assets : [];
};

/** The project stylesheet as published, in its cascade layer, media resolved; '' when absent. */
export function customCss(
  site: { customCss?: string | undefined; assets: Record<string, Asset> },
  mediaBase: string,
) {
  if (!site.customCss) return '';
  const r = checkCustomCss(site.customCss);
  if (!r.ok || !r.css) return '';
  const css = r.css.replace(/url\("?ns-asset:(a[a-z0-9]{8,32})"?\)/g, (_, id: string) => {
    const file = site.assets[id]?.file;
    return file ? `url("${mediaBase}${file}")` : 'none';
  });
  return `@layer ns-custom{${css}}`;
}
