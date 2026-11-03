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

/** What each command does, the permission it requires and what it changes. Every command is undoable. */
const META: Record<CommandName, Meta> = {
  updateNodeProps: {
    description: 'Modifie des propriétés de contenu d’un élément (texte, lien, média…).',
    permission: 'content',
    effects: ['nodes'],
  },
  renameNode: {
    description: 'Renomme un élément dans l’arborescence.',
    permission: 'content',
    effects: ['nodes'],
  },
  setOverride: {
    description: 'Donne une valeur propre à un paramètre d’une instance de composant partagé.',
    permission: 'content',
    effects: ['nodes'],
  },
  updateNodeStyle: {
    description: 'Définit ou retire des propriétés de style d’un élément, pour un breakpoint.',
    permission: 'design',
    effects: ['nodes'],
  },
  setNodeClasses: {
    description: 'Remplace les classes CSS personnalisées d’un élément (crochets de la feuille du projet).',
    permission: 'design',
    effects: ['nodes'],
  },
  setProjectCss: {
    description: 'Remplace la feuille de style du projet ; refusée si l’analyseur la rejette (ADR-0023).',
    permission: 'design',
    effects: ['site'],
  },
  setAnimations: {
    description: 'Remplace les animations déclaratives d’un élément.',
    permission: 'design',
    effects: ['nodes'],
  },
  setToken: {
    description: 'Crée ou remplace un design token (couleur, taille, police, style de texte).',
    permission: 'design',
    effects: ['tokens'],
  },
  removeToken: {
    description: 'Supprime un design token inutilisé.',
    permission: 'design',
    effects: ['tokens'],
  },
  insertNode: {
    description: 'Insère un composant avec ses valeurs par défaut.',
    permission: 'structure',
    effects: ['nodes'],
  },
  insertTree: {
    description: 'Insère un arbre de composants (section, composition).',
    permission: 'structure',
    effects: ['nodes'],
  },
  moveNode: {
    description: 'Déplace un élément vers un autre parent ou une autre position.',
    permission: 'structure',
    effects: ['nodes'],
  },
  removeNode: {
    description: 'Supprime un élément et ses enfants.',
    permission: 'structure',
    effects: ['nodes'],
  },
  duplicateNode: {
    description: 'Duplique un élément après lui-même.',
    permission: 'structure',
    effects: ['nodes'],
  },
  createSymbol: {
    description: 'Fait d’un élément un composant partagé dont il devient la première instance.',
    permission: 'structure',
    effects: ['symbols', 'nodes'],
  },
  importSymbol: {
    description: 'Ajoute une section de la bibliothèque comme composant partagé du site.',
    permission: 'structure',
    effects: ['symbols', 'nodes'],
  },
  insertSymbol: {
    description: 'Insère un composant partagé, lié ou en copie indépendante.',
    permission: 'structure',
    effects: ['nodes'],
  },
  updateSymbol: {
    description: 'Modifie le nom, la catégorie, la description ou les paramètres d’un composant partagé.',
    permission: 'structure',
    effects: ['symbols'],
  },
  publishSymbol: {
    description: 'Publie la version suivante d’un composant partagé.',
    permission: 'structure',
    effects: ['symbols'],
  },
  updateInstances: {
    description:
      'Met à jour les instances d’un composant vers sa dernière version, en conservant leurs valeurs propres.',
    permission: 'structure',
    effects: ['nodes'],
  },
  detachInstance: {
    description: 'Transforme une instance en copie indépendante.',
    permission: 'structure',
    effects: ['nodes'],
  },
  removeSymbol: {
    description: 'Supprime un composant partagé sans instance.',
    permission: 'structure',
    effects: ['symbols', 'nodes'],
  },
  createLayout: {
    description: 'Crée un header ou un footer partagé.',
    permission: 'structure',
    effects: ['layouts', 'nodes', 'site'],
  },
  removeLayout: {
    description: 'Supprime un header ou un footer partagé.',
    permission: 'structure',
    effects: ['layouts', 'nodes', 'pages', 'site'],
  },
  setMenu: {
    description: 'Crée ou remplace un menu de navigation.',
    permission: 'structure',
    effects: ['menus'],
  },
  removeMenu: {
    description: 'Supprime un menu qu’aucune navigation n’affiche.',
    permission: 'structure',
    effects: ['menus'],
  },
  createPage: {
    description: 'Crée une page avec son adresse et son contenu initial.',
    permission: 'pages',
    effects: ['pages', 'nodes'],
  },
  updatePage: {
    description: 'Modifie le titre, l’adresse, la publication ou les métadonnées SEO d’une page.',
    permission: 'pages',
    effects: ['pages'],
  },
  duplicatePage: {
    description: 'Duplique une page et son contenu.',
    permission: 'pages',
    effects: ['pages', 'nodes'],
  },
  removePage: {
    description: 'Supprime une page qu’aucun lien ni menu ne vise.',
    permission: 'pages',
    effects: ['pages', 'nodes'],
  },
  movePage: { description: 'Change l’ordre d’une page.', permission: 'pages', effects: ['pages'] },
  setHomePage: { description: 'Désigne la page d’accueil.', permission: 'pages', effects: ['pages', 'site'] },
  setPageLayout: {
    description: 'Affiche ou masque le header ou le footer d’une page.',
    permission: 'pages',
    effects: ['pages'],
  },
  setRedirects: {
    description: 'Remplace les redirections du site.',
    permission: 'pages',
    effects: ['redirects'],
  },
  updateSite: {
    description: 'Modifie le nom, la langue ou l’URL canonique du site.',
    permission: 'site',
    effects: ['site'],
  },
  addAsset: {
    description: 'Ajoute à la médiathèque un média déjà envoyé au serveur.',
    permission: 'site',
    effects: ['assets'],
  },
  updateAsset: {
    description: 'Modifie le nom, le texte alternatif par défaut ou les tags d’un média.',
    permission: 'site',
    effects: ['assets'],
  },
  removeAsset: {
    description: 'Retire de la médiathèque un média inutilisé.',
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
