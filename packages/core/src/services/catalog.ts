import { z } from 'zod';
import { type CommandName, commands } from '../editor/commands.ts';

/**
 * Permissions of the commands (CS-10, ADR-0013). A caller (the Studio user, the AI assistant, a
 * future MCP client) is granted a set of them; a batch is refused if one call exceeds it.
 */
export const PERMISSIONS = ['content', 'design', 'structure', 'pages', 'site'] as const;
export type Permission = (typeof PERMISSIONS)[number];
export type Effect =
  | 'nodes'
  | 'pages'
  | 'site'
  | 'assets'
  | 'tokens'
  | 'menus'
  | 'layouts'
  | 'symbols'
  | 'redirects';

type Meta = { description: string; permission: Permission; effects: Effect[] };

/**
 * What each command does (in English: read by the AI and future MCP clients, ADR-0024), the permission it
 * requires and what it changes. Every command is undoable.
 */
const META: Record<CommandName, Meta> = {
  updateNodeProps: {
    description: 'Changes content properties of an element (text, link, media…).',
    permission: 'content',
    effects: ['nodes'],
  },
  renameNode: {
    description: 'Renames an element in the tree.',
    permission: 'content',
    effects: ['nodes'],
  },
  setOverride: {
    description: 'Gives its own value to a parameter of a shared component instance.',
    permission: 'content',
    effects: ['nodes'],
  },
  updateNodeStyle: {
    description: 'Sets or removes style properties of an element, for one breakpoint.',
    permission: 'design',
    effects: ['nodes'],
  },
  setNodeClasses: {
    description: 'Replaces the custom CSS classes of an element (hooks of the project stylesheet).',
    permission: 'design',
    effects: ['nodes'],
  },
  setProjectCss: {
    description: 'Replaces the project stylesheet; refused if the parser rejects it (ADR-0023).',
    permission: 'design',
    effects: ['site'],
  },
  setAnimations: {
    description: 'Replaces the declarative animations of an element.',
    permission: 'design',
    effects: ['nodes'],
  },
  setToken: {
    description: 'Creates or replaces a design token (color, size, font, text style).',
    permission: 'design',
    effects: ['tokens'],
  },
  removeToken: {
    description: 'Deletes an unused design token.',
    permission: 'design',
    effects: ['tokens'],
  },
  insertNode: {
    description: 'Inserts a component with its default values.',
    permission: 'structure',
    effects: ['nodes'],
  },
  insertTree: {
    description: 'Inserts a tree of components (section, composition).',
    permission: 'structure',
    effects: ['nodes'],
  },
  moveNode: {
    description: 'Moves an element to another parent or position.',
    permission: 'structure',
    effects: ['nodes'],
  },
  removeNode: {
    description: 'Deletes an element and its children.',
    permission: 'structure',
    effects: ['nodes'],
  },
  duplicateNode: {
    description: 'Duplicates an element after itself.',
    permission: 'structure',
    effects: ['nodes'],
  },
  createSymbol: {
    description: 'Turns an element into a shared component, of which it becomes the first instance.',
    permission: 'structure',
    effects: ['symbols', 'nodes'],
  },
  importSymbol: {
    description: 'Adds a library section as a shared component of the site.',
    permission: 'structure',
    effects: ['symbols', 'nodes'],
  },
  insertSymbol: {
    description: 'Inserts a shared component, linked or as an independent copy.',
    permission: 'structure',
    effects: ['nodes'],
  },
  updateSymbol: {
    description: 'Changes the name, category, description or parameters of a shared component.',
    permission: 'structure',
    effects: ['symbols'],
  },
  publishSymbol: {
    description: 'Publishes the next version of a shared component.',
    permission: 'structure',
    effects: ['symbols'],
  },
  updateInstances: {
    description: 'Updates the instances of a component to its latest version, keeping their own values.',
    permission: 'structure',
    effects: ['nodes'],
  },
  detachInstance: {
    description: 'Turns an instance into an independent copy.',
    permission: 'structure',
    effects: ['nodes'],
  },
  removeSymbol: {
    description: 'Deletes a shared component without instances.',
    permission: 'structure',
    effects: ['symbols', 'nodes'],
  },
  createLayout: {
    description: 'Creates a shared header or footer.',
    permission: 'structure',
    effects: ['layouts', 'nodes', 'site'],
  },
  removeLayout: {
    description: 'Deletes a shared header or footer.',
    permission: 'structure',
    effects: ['layouts', 'nodes', 'pages', 'site'],
  },
  setMenu: {
    description: 'Creates or replaces a navigation menu.',
    permission: 'structure',
    effects: ['menus'],
  },
  removeMenu: {
    description: 'Deletes a menu that no navigation shows.',
    permission: 'structure',
    effects: ['menus'],
  },
  createPage: {
    description: 'Creates a page with its address and initial content.',
    permission: 'pages',
    effects: ['pages', 'nodes'],
  },
  updatePage: {
    description: 'Changes the title, address, publication or SEO metadata of a page.',
    permission: 'pages',
    effects: ['pages'],
  },
  duplicatePage: {
    description: 'Duplicates a page and its content.',
    permission: 'pages',
    effects: ['pages', 'nodes'],
  },
  removePage: {
    description: 'Deletes a page that no link or menu targets.',
    permission: 'pages',
    effects: ['pages', 'nodes'],
  },
  movePage: { description: 'Changes the order of a page.', permission: 'pages', effects: ['pages'] },
  setHomePage: { description: 'Sets the home page.', permission: 'pages', effects: ['pages', 'site'] },
  setPageLayout: {
    description: 'Shows or hides the header or footer of a page.',
    permission: 'pages',
    effects: ['pages'],
  },
  setRedirects: {
    description: 'Replaces the redirects of the site.',
    permission: 'pages',
    effects: ['redirects'],
  },
  updateSite: {
    description: 'Changes the name, language or canonical URL of the site.',
    permission: 'site',
    effects: ['site'],
  },
  addAsset: {
    description: 'Adds to the media library a file already uploaded to the server.',
    permission: 'site',
    effects: ['assets'],
  },
  updateAsset: {
    description: 'Changes the name, default alternative text or tags of a media file.',
    permission: 'site',
    effects: ['assets'],
  },
  removeAsset: {
    description: 'Removes an unused media file from the media library.',
    permission: 'site',
    effects: ['assets'],
  },
};

/** A command as a tool: the shape of an MCP tool (`name`, `description`, `inputSchema`) plus its contract. */
export type ToolDescription = {
  name: CommandName;
  description: string;
  inputSchema: Record<string, unknown>;
  permission: Permission;
  effects: Effect[];
  undoable: true;
  /** Result: `{ ok: true, created?, notice? }`; errors: `not-found`, `not-allowed`, `invalid` with a message. */
  result: 'CommandResult';
};

let catalog: ToolDescription[] | null = null;
/** Catalog of every command (computed once). */
export function commandCatalog(): ToolDescription[] {
  catalog ??= (Object.keys(commands) as CommandName[]).map((name) => {
    const { $schema: _, ...inputSchema } = z.toJSONSchema(commands[name].params, {
      unrepresentable: 'any',
    }) as Record<string, unknown>;
    return { name, ...META[name], inputSchema, undoable: true, result: 'CommandResult' };
  });
  return catalog;
}

export const permissionOf = (name: CommandName): Permission => META[name].permission;
