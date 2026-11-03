# Tatsu autonome : étude de faisabilité

> **Objet :** choisir la stratégie la plus réaliste pour créer un page builder indépendant de WordPress, qui s'appuie sur un modèle documentaire JSON et sur un moteur de rendu Astro.
> **Base analysée :** Tatsu 3.5.3 (`oshin/plugins/tatsu`), avec Oshine Modules 3.4.3 pour comparaison. Voir aussi l'analyse fonctionnelle `TATSU-ANALYSE.md`.
> **Date :** 29/10/2026.

## Conventions

Chaque affirmation porte l'un de ces trois marqueurs :

| Marqueur | Sens |
|---|---|
| **[F]** Fait observé | Lu dans le code, avec une référence `fichier:ligne` ou une fonction |
| **[H]** Hypothèse | Déduite du code, mais **pas vérifiée par exécution** |
| **[R]** Recommandation | Proposition de l'auteur |

**Chemins :** ils sont relatifs à `oshin/plugins/tatsu/`, sauf mention contraire. `bundle.js` désigne `builder/js/bundle.js`, la version non minifiée de 5,6 Mo (168 955 lignes) produite par webpack.

**Méthode :** lecture ciblée du code PHP et du bundle, puis deux scripts d'inventaire statique. Le premier recense les appels PHP présents dans les fonctions d'enregistrement de modules. Le second classe chaque définition d'attribut selon qu'elle est convertible en JSON ou non. **Aucun code Tatsu n'a été exécuté.**

---

## 0. Synthèse

1. **[F]** L'éditeur reçoit à son ouverture tout ce dont il a besoin, injecté dans `window.tatsuConfig` : le contenu de la page et les schémas de modules **déjà résolus** (`builder/class-tatsu-builder.php:245-280`, consommés dans `bundle.js:12377` et `bundle.js:12937`). Toutes ses entrées et sorties passent ensuite par un seul canal, des requêtes `$.ajax` POST vers `tatsuConfig.ajaxurl` avec un paramètre `action`. **[H]** L'éditeur React 15 peut donc probablement tourner avec un backend simulé, au prix de plusieurs substituts (*shims*) : `wp.media`, TinyMCE, et une page d'aperçu.
2. **[F]** Sur les 844 définitions d'attributs analysées dans Tatsu, **94,8 % sont des littéraux PHP purs** (avec traductions et constantes), 4,7 % appellent une fonction ou utilisent une variable, et 0,5 % déclarent un callback PHP. **[R]** La voie la plus sûre n'est pas d'analyser le PHP, mais d'**exporter les schémas à l'exécution** (le même objet que celui que reçoit l'éditeur), puis de les normaliser avec Zod.
3. **[F]** Tatsu contient **deux moteurs CSS distincts qui ne se comportent pas de la même façon** :
   - en PHP, `be_generate_css_from_atts` produit une feuille de style avec media queries ;
   - en JS, le module webpack 96 de `bundle.js` produit des styles inline React pour un seul device à la fois.

   Au moins cinq divergences ont été repérées (§3.3). **[R]** Le nouveau moteur TypeScript doit prendre le **rendu PHP comme référence** et être validé par des tests *golden master*.
4. **[R]** Je recommande la **stratégie B** (interface moderne reconstruite), et de n'utiliser la **stratégie A** que comme **banc d'observation limité dans le temps**. La stratégie A garde un bundle compilé sans sources (React 15.3.2, sorti en 2016), redistribue du code GPL, et **ne supprime pas** le double rendu (aperçu React d'un côté, sortie Astro de l'autre), qui est la principale source de dette.

---

## 1. Axe 1 : autonomie réelle de l'éditeur

### 1.1 Comment l'éditeur démarre

| Étape | Mécanisme | Référence |
|---|---|---|
| 1 | WordPress sert la page « shell » de l'éditeur (`<div id="root">`) | **[F]** `builder/tatsu-index.php:88`, `Tatsu_Builder::init()` (`builder/class-tatsu-builder.php:22`) |
| 2 | PHP calcule le contenu et les schémas, puis les injecte via `wp_localize_script('tatsu','tatsuConfig', …)` | **[F]** `class-tatsu-builder.php:198-280` (`$content = $store->get_page_content()`, `$module_options = $store->get_module_options()`) |
| 3 | Les reducers Redux s'initialisent à partir de `tatsuConfig.content` et `tatsuConfig.module_options` | **[F]** `bundle.js:12377` (`pageContent` → `parseContent(tatsuConfig.content, tatsuConfig.module_options)`), `bundle.js:12937` |
| 4 | React 15.3.2 se monte dans `#root` | **[F]** `bundle.js:74118`, version `bundle.js:71869` |
| 5 | Une iframe `#tatsu-preview` charge **la vraie page WordPress** avec `?tatsu-frame=1&post_id=…` | **[F]** `bundle.js:33979`, URL construite vers `bundle.js:33965` |
| 6 | Côté WordPress, `the_content` est remplacé par `<div id="tatsu-content-wrap"></div>`, et TinyMCE et `tatsu-frame.js` sont chargés | **[F]** `Tatsu_Frame::builder_wrapper()` (`builder/class-tatsu-frame.php:95`), `enqueue_scripts()` (`:148-154`) |
| 7 | Le builder **rend l'arbre React directement dans le document de l'iframe** (`ReactDOM.render(…, content1)`) | **[F]** `bundle.js:33884-33941` |
| 8 | L'iframe renvoie au parent les événements de l'édition inline (`showToolbar`, `pushToState`, `hideToolbar`, `resetDrag`) | **[F]** `builder/js/tatsu-frame.js:161-300`, écoute `message` (`:183`) |

**[F]** L'action `loadInitialState` (`bundle.js:758`), qui interroge le REST `/store`, `/header_store` et `/footer_store`, est **définie mais jamais appelée** : `grep "loadInitialState()"` ne trouve que sa définition. Les routes REST correspondantes (`includes/rest_api/class-tatsu-rest-api.php:20-170`) ne servent donc pas au chargement de l'éditeur de page.

**[F]** Il y a d'ailleurs une incohérence. Le JS attend `data.tatsu_page_content` et `data.tatsu_module_options` (`bundle.js:773-774`, `:811`, `:852`), alors que `Tatsu_Store::get_store()` renvoie un tableau fusionné sans ces clés (`includes/rest_api/class-tatsu-store.php:194-206`, `get_page_content()` `:217`). **[H]** Ce code REST est probablement abandonné.

### 1.2 Appels AJAX réellement émis par l'éditeur

**[F]** Tous les appels passent par `fireAjax()` (`bundle.js:89484` : POST vers `tatsuConfig.ajaxurl`, ajout de `nonce`, en-tête `X-WP-Nonce`) ou par des `$.ajax` directs vers la même URL. Inventaire obtenu par recherche de `action:` dans le bundle :

| Action AJAX | Appel JS | Gestionnaire PHP | Envoi | Retour attendu |
|---|---|---|---|---|
| `tatsu_save_store` | `bundle.js:1114-1135` | `Tatsu_Store::ajax_save_store` (`class-tatsu-store.php:243`) | `post_id`, `page_content` (arbre JSON sans `shortcode_output`), `post_name`, `post_status`, `tatsu_body_fonts`, `custom_css`, `custom_js` | ignoré, sauf succès ou échec |
| `tatsu_save_header_store` / `tatsu_save_footer_store` | `bundle.js:1094`, `:1105` | stores header et footer | idem + `settings` (header) | idem |
| `tatsu_module` | `bundle.js:447`, `:492` (`updateShortcode`) | `Tatsu_Module::ajax_get_module_shorcode_output` (`rest_api/class-tatsu-module.php:58-75`) | `module` : nœud JSON | **HTML** produit par `do_shortcode` |
| `tatsu_get_concepts`, `tatsu_get_header_concepts`, `tatsu_get_footer_concepts` | `bundle.js:656`, `:720`, `:689` | `Tatsu_Section_Concepts::ajax_get_section_concepts` (`rest_api/class-tatsu-section-concepts.php:35-55`) | — | JSON `{nom: {title, img, shortcode…}}` |
| `tatsu_get_template`, `tatsu_save_template`, `tatsu_delete_template`, `tatsu_get_templates_list`, `tatsu_get_prebuilt_templates` | `bundle.js:887`, `:927`, `:989`, `:1029`, `:56406`, `:56462`, `:88152` | `Tatsu_Page_Templates::ajax_*` (`rest_api/class-tatsu-page-templates.php:49-160`) | nom et type de template | arbre JSON (les shortcodes stockés dans l'option `tatsu_templates` sont reparsés par `Tatsu_Parser`, `:65-75`) |
| `get_revision_data`, `get_revision_content` | `bundle.js:1147`, `:1982`, `:2033` | `Tatsu_Store::ajax_get_revision_content` (`:311`), `tatsu_revision_data()` (`includes/helpers/helpers.php:1345`) | `post_id`, offset, id de révision | liste `{key, post_date, short_date, author}` / arbre JSON |
| `tatsu_paste_shortcode` | `bundle.js:1315` | `Tatsu_Store::ajax_paste_shortcode` (`:287-301`) | texte shortcode | arbre JSON |
| `tatsu_get_images_from_id` | `bundle.js:82434` | `Tatsu_Rest_Api::get_images_from_id` (`rest_api/class-tatsu-rest-api.php:173`) | ids d'images, taille | URLs |

**[F]** Les autres actions `wp_ajax_*` enregistrées dans `includes/class-tatsu.php` (licence, reCAPTCHA, Instagram, réglages UI, notices) et dans `includes/typehub/`, `includes/colorhub/` et `includes/demo-import/` relèvent de l'administration, pas de l'éditeur de page.

**[F]** Les appels `tatsu_module` sont **conditionnés aux modules non intégrés** (non *built-in*), par exemple `'sub_module' == moduleType && !isBuiltIn` en `bundle.js:406`. Pour les modules intégrés, le composant React est pris dans `builtInCollection` (module webpack 751, `bundle.js:92443`), qui contient **46 composants** : `tatsu_button`, `tatsu_text`, `tatsu_image`, `tatsu_inline_text`, `tatsu_icon`, `tatsu_tabs`, `tatsu_accordion`, en-têtes… Le dispatch se fait dans `builtInModuleHelper` (`bundle.js:24842-24871`). À défaut, il lit `tatsuConfig[moduleName]` (`:24856`), un point d'extension pour des composants tiers.

### 1.3 Dépendances à l'environnement WordPress

**Variables globales JavaScript.** Recensement par `grep "window\.X"` et par nom dans le bundle :

| Globale | Usages | Fournie par | Rôle |
|---|---|---|---|
| `tatsuConfig` | 143 + 20 | `wp_localize_script` (`class-tatsu-builder.php:245-280`) | contenu, schémas, URLs, nonce, `post_id`, couleurs globales, révisions, CSS/JS custom, catégories… (environ 35 clés, la plus utilisée étant `nonce` avec 36 usages) |
| `tatsuIcons`, `tatsuSvgs` | — | `wp_localize_script` (`:283-292`) | catalogues d'icônes |
| `wp.media` | 2 | `wp_enqueue_media()` (`:226`) | sélecteurs d'images (`bundle.js:82282`, `:82963`) |
| `tinyMCEPreInit`, `quicktags` | 1 + 1 | `wp_editor()` (`:328-345`) | configuration de l'éditeur riche (`bundle.js:83678-83691`) |
| `tinymce` (dans l'iframe) | 20 | `includes_url('js/tinymce/tinymce.min.js')` (`class-tatsu-frame.php:151`) | édition inline (`bundle.js:1432`, `:14783-14952`) |
| `typehub_font_options`, `typehub_selectors` | 29 + 13 | Typehub | résolution des polices dans le CSS (`getFontFamily`, module webpack 96) |
| `colorhub` | 7 | Colorhub | palettes et swatches (`bundle.js:31449`) |
| `WebFont` | 6 | `ajax.googleapis.com/…/webfont.js` (`class-tatsu-builder.php:244`) | chargement des Google Fonts |
| `jQuery` | — | **intégré au bundle** (jQuery 3.1.0, module webpack 4) | AJAX, manipulation du DOM de l'iframe |

**Dépendances PHP et WordPress de l'éditeur :**

| Dépendance | Où | Remplaçable hors WP ? |
|---|---|---|
| Authentification et nonce (`wp_create_nonce('wp_rest')`, `wp_verify_nonce`) | `class-tatsu-builder.php:260`, `class-tatsu-rest-api.php:190` | oui (jeton du backend) |
| Droits (`current_user_can(…publish_posts)`) | `class-tatsu-builder.php:189` | oui |
| Rendu de la page d'aperçu par le thème (header, footer, CSS du thème, filtre `the_content`) | `class-tatsu-frame.php:31-154` | oui, avec une page HTML statique d'aperçu **[H]** |
| Rendu serveur des modules non intégrés (`do_shortcode`) | `class-tatsu-module.php:21-75` | seulement en réimplémentant chaque module |
| Stockage (`post_content` en shortcodes + meta `_tatsu_page_content`) | `Tatsu_Page_Content::set_page_content` (`rest_api/class-tatsu-page-content.php:31-55`) | oui |
| Analyse des shortcodes (`get_shortcode_regex`, `$shortcode_tags`) | `Tatsu_Parser::parse` (`includes/class-tatsu-content-parser.php:28-41`) | oui, avec un parseur TS à écrire |
| Révisions (`wp_get_post_revisions`) | `tatsu_revision_data()` (`helpers.php:1345`) | oui |
| Médiathèque (identifiants d'attachement, `wp_get_attachment_image_src`, `srcset`) | `includes/modules/single_image.php` (render), `get_images_from_id` | oui, avec un service média |

### 1.4 Ce qui fonctionne déjà sans WordPress

| Élément | Statut |
|---|---|
| Store Redux et Immutable, reducers, undo/redo (`undoable`, `bundle.js:95075` ; historique `past`/`present`/`future`) | **[F]** entièrement côté client |
| Glisser-déposer, arbre, menu contextuel, raccourcis, copier/coller de styles (`bundle.js:32858-32995`) | **[F]** côté client |
| Panneau de réglages généré depuis `group_atts` | **[F]** côté client, piloté par `tatsuConfig.module_options` |
| Aperçu des 46 modules intégrés et moteur de style JS (module 96) | **[F]** côté client |
| Aperçu des modules non intégrés (dont tous les Oshine Modules) | **[F]** dépend de `tatsu_module`, donc d'un rendu serveur |
| Édition inline | **[F]** dépend de TinyMCE dans l'iframe et de `tinyMCEPreInit` |
| Médias, templates, sections préconçues, révisions, sauvegarde | **[F]** dépendent du backend (simulable) |

### 1.5 Conclusion de l'axe 1

**[H]** L'éditeur existant peut fonctionner avec un backend simulé si on lui fournit :
- un `window.tatsuConfig` complet (le schéma exporté depuis WordPress, voir §2.3) ;
- un endpoint unique qui répond aux 16 actions du tableau §1.2 ;
- un substitut de `wp.media` ;
- TinyMCE 4 et un `tinyMCEPreInit.mceInit.tatsu_editor` ;
- une page d'aperçu statique qui contient `#tatsu-content-wrap`, `#tatsu-absolute-wrapper`, `tatsu-frame.js` et `tatsu-frame.css`, ainsi que le CSS et le JS publics de Tatsu (`public/css/tatsu.css`, `public/js/tatsu.js` et ses vendors).

Ce n'est pas vérifié. **[R]** Il faut le confirmer par un *spike* de 2 à 3 jours (§4.4).

---

## 2. Axe 2 : portage des schémas déclaratifs

### 2.1 Comment un schéma est construit

**[F]** Un module passe par quatre étapes :
1. `add_action('tatsu_register_modules', 'tatsu_register_xxx')`, puis `tatsu_register_module()` ou `tatsu_remap_modules()` (`includes/helpers/api.php:3-35`) ;
2. `Tatsu_Module_Options::register_module` (`rest_api/class-tatsu-module-options.php:37-50`), qui appelle `tatsu_parse_group_atts()` (`helpers.php:1669`), applique le filtre `tatsu_register_module_filter_options`, puis appelle `tatsu_parse_module_options()` (`helpers.php:900`) ;
3. ce filtre **injecte les attributs communs** de `Tatsu_Config::get_common_atts()` (`includes/class-tatsu-config.php:60-369`) via `Tatsu_Public::tatsu_add_common_atts_to_module_options` (`public/class-tatsu-public.php`, branché en `class-tatsu.php:500`). La fusion dans `group_atts` est faite par `tatsu_smart_merge_group_atts` (`helpers.php:1460`) et tient compte des `exclude` ;
4. un second filtre force `is_dynamic=false` par défaut (`helpers.php:1795`).

**[F]** L'enregistrement se déclenche sur le hook `wp_loaded` (`class-tatsu.php:625-636`). Le résultat complet est `Tatsu_Module_Options::get_module_options()` (`:84-91`, qui retire les doublons remappés), et c'est exactement ce que reçoit l'éditeur (`class-tatsu-builder.php:272`).

### 2.2 Ce qui empêche une conversion directe en JSON

Inventaire des fonctions d'enregistrement (89 fonctions dans Tatsu, 61 dans Oshine Modules) :

| Construction | Volume | Exemple | Traitement proposé |
|---|---|---|---|
| Traductions `esc_html__()` / `__()` | 1 715 (Tatsu), 791 + 66 (Oshine) | partout | **[R]** extraire la chaîne source et la clé de traduction |
| `tatsu_get_color('tatsu_accent_color')` dans les presets et défauts | 56 (Tatsu), 28 (Oshine) | `modules/button.php:957-958` | **[R]** garder la référence (`{id:'palette:0'}`), résolue par les tokens |
| Constantes `TATSU_PLUGIN_URL` (icônes, images) | environ 930 occurrences de constantes | `modules/button.php:376` | **[R]** remplacer par un chemin d'asset relatif |
| `typehub_get_exposed_selectors()` | 15 | attributs typographiques | **[R]** liste statique de styles typo issue des tokens |
| Listes dépendant des données WordPress : `tatsu_header_get_menu_list()`, `tatsu_get_sidebar_list()`, `tatsu_get_custom_post_types()`, `get_posts()`, `get_terms()`, `get_categories()`, `get_tags()` | ~20 | nav-menu, blog, portfolio | **[R]** options dynamiques déclarées (`optionsSource: 'menus'`), fournies par le backend ou le CMS |
| Listes calculées : `tatsu_css_animations()`, `tatsu_get_blend_modes()`, `tatsu_get_shape_dividers()`, `tatsu_get_custom_fields_dropdown()` | ~20 | `class-tatsu-config.php:102` | **[R]** à figer en constantes JSON |
| Conditions d'exécution (`if`, `is_tatsu_pro_active()`, `function_exists`, `current_theme_supports`, `be_theme_name`) | 15 `if` et 4 `foreach` (Tatsu), 29 `if` et 9 `foreach` (Oshine) | `modules/moduless.php:19` | **[R]** variantes figées au moment de l'export |
| **Callbacks PHP dans les sélecteurs CSS** (`'callback' => 'fn'`, exécuté par `call_user_func` dans `be_compute_css`, `be-helpers.php:271`) | 6 sélecteurs | `modules/row.php:406-411` et `:743-748` (`tatsu_row_margin_top_callback`, `tatsu_row_margin_bottom_callback`), `single_image.php:579`, `multi_layer_image.php:418` (`single_image_overflow_callback`) | **[R]** réécrire à la main en transformations TS nommées (`transform: 'rowMarginTop'`) |
| Hooks avant le calcul CSS : filtre `{module}_before_css_generation` (`be-helpers.php:383`) et, côté JS, `modifyAttsBeforeCSSCompute` (module 719 : `tatsu_column`, `tatsu_section` pour `z_index + 2`, `tatsu_call_to_action` pour les bordures) | 3 modules (JS) | `bundle.js:90020-90052` | **[R]** pré-transformations TS par module |
| Pré-traitements dans les fonctions de rendu PHP (`tatsu_*_remove_atts`, `*_modify_bg_color`, `*_header_atts`) | par module | `modules/section.php`, `column.php`, `button.php` | **[R]** à porter dans les composants de rendu, pas dans le schéma |

### 2.3 Part des attributs convertibles automatiquement

**[F]** Un script de classification a analysé chaque bloc `array( 'att_name' => … )` après neutralisation des chaînes et des commentaires :

| Corpus | Attributs | A. Littéral pur (i18n et constantes inclus) | B. Appel de fonction ou variable | C. Callback PHP |
|---|---|---|---|---|
| Tatsu (`includes/modules`, `includes/header-builder/modules`, `class-tatsu-config.php`) | 844 (dont 456 avec `selectors` CSS) | **800 (94,8 %)** | 40 (4,7 %) | 4 (0,5 %) |
| Oshine Modules (`includes/modules`) | 547 (194 avec CSS) | **529 (96,7 %)** | 18 (3,3 %) | 0 |

Causes principales de la catégorie B (Tatsu) : `typehub_get_exposed_selectors` (15), variables `$…` (10), `tatsu_get_blend_modes` (4), `tatsu_css_animations` (3), `tatsu_get_custom_fields_dropdown` (3), `is_tatsu_pro_active` (3), `tatsu_header_get_menu_list` (3).

**[H]** Cette heuristique compte les blocs ; quelques attributs dupliqués peuvent être comptés deux fois. L'ordre de grandeur (environ 95 % de littéraux) reste fiable.

**Deux voies d'extraction :**

| | Voie 1 : export à l'exécution **[R, recommandée]** | Voie 2 : analyse statique du PHP |
|---|---|---|
| Principe | Démarrer WordPress avec Tatsu et Oshine Modules, puis `wp eval 'echo wp_json_encode(Tatsu_Module_Options::getInstance()->get_module_options());'` (idem pour `Tatsu_Header_Module_Options`, `Tatsu_Footer_Module_Options`, `Tatsu_Global_Module_Options`, `Tatsu_Config::get_common_atts()`, `Tatsu_Colors`, les options Typehub) | Parser PHP (ex. `nikic/php-parser`) ou script de tokenisation |
| Couverture | 100 % des **valeurs résolues**, attributs communs fusionnés : identique à ce que voit l'éditeur | environ 95 %, et les attributs communs doivent être refusionnés à la main |
| Pertes | traductions figées dans une locale ; listes dynamiques figées (données de l'instance) ; callbacks réduits à leur **nom** ; variantes `if` figées | callbacks et listes dynamiques, comme pour la voie 1 |
| Prérequis | une instance WordPress. **[F]** `php` (`/opt/homebrew/bin/php`) et `wp-cli` (`/usr/local/bin/wp`) sont installés sur ce poste. **[H]** `wp_loaded` se déclenche aussi sous wp-cli, donc les modules s'enregistrent | aucun |

**[R]** Utiliser la voie 1 pour produire `schemas/raw/*.json`, puis un script de normalisation TypeScript qui :
- valide chaque schéma avec Zod ;
- remplace les valeurs de couleur résolues par des références ;
- convertit les URLs absolues en assets ;
- signale à la main les 6 callbacks et les ~20 listes dynamiques.

On peut exécuter l'export une deuxième fois dans une autre locale pour récupérer les traductions.

### 2.4 Format de schéma proposé (TypeScript + Zod)

**[F]** La syntaxe à couvrir, telle qu'observée :
- `visible` / `hidden` : soit un triplet `['url','!=','']` (`button.php:610`), soit `{condition:[…], relation:'and'}` (`tatsu_global_section_meta_values`, `helpers.php:858-867`). Opérateurs : `=`, `!=`, `==`, `<`, `>`.
- `when` : soit un triplet unique (`section.php:547`), soit une liste de triplets (`button.php:663-668`), avec `relation`. Opérateurs : `=` (242), `!=` (378), `notempty` (99), `empty` (11). Le côté droit peut être un objet par device (`be_should_compute_css`, `be-helpers.php:141`).
- Champs de sélecteur : `property` (chaîne ou liste), `prepend`, `append`, `operation: [op, n]`, `callback`.

**[R]** Proposition de format :

```ts
// schema/module.ts
import { z } from 'zod';

export const Device = z.enum(['d', 'l', 't', 'm']);
export const Responsive = <T extends z.ZodTypeAny>(v: T) =>
  z.union([v, z.object({ d: v.optional(), l: v.optional(), t: v.optional(), m: v.optional() })]);

const Op = z.enum(['=', '!=', '==', '<', '>', 'empty', 'notempty']);
export const Condition = z.tuple([z.string(), Op, z.unknown().optional()]);
export const ConditionExpr = z.union([
  Condition,
  z.object({ condition: z.array(Condition), relation: z.enum(['and', 'or']).default('and') }),
]);

export const SelectorRule = z.object({
  property: z.union([z.string(), z.array(z.string())]),
  when: z.union([Condition, z.array(Condition)]).optional(),
  relation: z.enum(['and', 'or']).optional(),
  prepend: z.string().optional(),
  append: z.string().optional(),
  operation: z.tuple([z.enum(['+', '-', '*', '/']), z.number()]).optional(),
  transform: z.string().optional(), // remplace le `callback` PHP par une transformation TS nommée
});

export const FieldType = z.enum([
  'text', 'text_area', 'tinymce', 'number', 'negative_number', 'slider', 'switch', 'select',
  'button_group', 'color', 'input_group', 'input_box_shadow', 'input_drop_shadow', 'typography',
  'single_image_picker', 'multi_image_picker', 'icon_picker', 'svg_icon_picker',
  'screen_visibility', /* … liste complétée à partir de l'export */
]);

export const Att = z.object({
  att_name: z.string(),
  type: FieldType,
  label: z.string(),
  default: z.unknown().optional(),
  tooltip: z.string().optional(),
  options: z.unknown().optional(),     // affiné par une union discriminée sur `type`
  optionsSource: z.string().optional(), // listes dynamiques : 'menus' | 'sidebars' | …
  responsive: z.boolean().optional(),
  is_inline: z.boolean().optional(),
  visible: ConditionExpr.optional(),
  hidden: ConditionExpr.optional(),
  exclude: z.array(z.string()).optional(),
  css: z.boolean().optional(),
  selectors: z.record(z.string(), SelectorRule).optional(), // clé : '.tatsu-{UUID} .x, .tatsu-{UUID} .y'
});

type GroupNode = string | { type: 'tabs' | 'tab' | 'accordion' | 'panel'; title?: string; style?: string; icon?: string; active?: number[]; group: GroupNode[] };
export const GroupNode: z.ZodType<GroupNode> = z.lazy(() => z.union([
  z.string(),
  z.object({ type: z.enum(['tabs', 'tab', 'accordion', 'panel']), title: z.string().optional(), style: z.string().optional(),
             icon: z.string().optional(), active: z.array(z.number()).optional(), group: z.array(GroupNode) }),
]));

export const ModuleSchema = z.object({
  tag: z.string(),
  aliases: z.array(z.string()).default([]),   // issus de tatsu_remap_modules
  title: z.string(),
  icon: z.string().optional(),
  type: z.enum(['core', 'single', 'multi', 'sub_module']),
  child_module: z.string().optional(),
  initial_children: z.number().optional(),
  hint: z.string().optional(),
  inline: z.boolean().optional(),
  is_dynamic: z.boolean().default(false),
  is_js_dependant: z.boolean().default(false),
  group_atts: z.array(GroupNode).default([]),
  atts: z.array(Att),
  presets: z.record(z.string(), z.object({ title: z.string().optional(), image: z.string().optional(), preset: z.record(z.string(), z.unknown()) })).optional(),
  preTransform: z.string().optional(),        // remplace modifyAttsBeforeCSSCompute / *_before_css_generation
});

// document
export type Node = { name: string; id: string; atts: Record<string, unknown>; inner?: Node[] };
export const NodeSchema: z.ZodType<Node> = z.lazy(() =>
  z.object({ name: z.string(), id: z.string(), atts: z.record(z.string(), z.unknown()), inner: z.array(NodeSchema).optional() }));
export const DocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(), title: z.string(),
  content: z.array(NodeSchema),          // l'équivalent de `inner` dans Tatsu
  customCss: z.string().default(''), customJs: z.string().default(''),
});
```

**[R]** Le format de nœud `{name, id, atts, inner}` reprend tel quel celui de Tatsu (`tatsu_shortcodes_from_content`, `helpers.php:189-232`). Les pages existantes se migrent ainsi sans transformation, à condition de dé-sérialiser les attributs JSON-dans-shortcode (voir le risque R7).

---

## 3. Axe 3 : génération de CSS

### 3.1 Règles côté serveur (PHP, la référence du rendu publié)

**[F]** La fonction `be_generate_css_from_atts($atts, $module, $uuid, $module_options)` (`includes/helpers/be-helpers.php:379-469`) procède ainsi :

1. Elle charge la configuration du module depuis `Tatsu_Module_Options` (ou `Tatsu_Header_…` / `Tatsu_Footer_…` selon le paramètre `builder_mode`), y compris pour les modules remappés (`:380-392`). Elle applique le filtre `{module}_before_css_generation` (`:383`).
2. Pour chaque attribut dont `css` est vrai, elle décode le JSON si l'attribut est `responsive` (`:400-406`).
3. Pour chaque sélecteur, elle remplace `{UUID}` par la `key` de l'instance (`:411`).
4. **Elle ne calcule rien si `!empty($value)` est faux** (`:413`), et de même par device avec `!empty($val)` (`:416`).
5. Elle évalue la condition avec `be_should_compute_css` (`:126-235`) :
   - elle fait un `extract($atts)` et compare la valeur brute d'un autre attribut ;
   - un attribut JSON responsive est décodé par device ;
   - un `trim()` est appliqué à la valeur testée ;
   - avec `relation:'and'`, la règle échoue dès qu'une condition est fausse ; sinon il suffit d'une condition vraie ;
   - **un attribut absent est ignoré** (`continue`, `:161`) au lieu de faire échouer la règle.
6. Elle calcule la déclaration avec `be_compute_css` (`:237-357`) :
   - typographie : `font-variant` devient `font-weight` + `font-style`, et `font-family` est résolu via `be_get_font_family` avec une pile système ajoutée ;
   - `callback` ;
   - propriété multiple ;
   - couleur via `be_compute_color` (`:65`, qui résout les références `palette:`/`swatch:` de Colorhub et les dégradés) ;
   - `prepend`/`append`, avec `append` supprimé si un `slider` ou un `number` contient déjà une unité ;
   - `operation` ;
   - cas particuliers `background-image: url()`, `transform: translate3d`, `transformX`, `transformY` ;
   - un tableau est réduit à sa première valeur.
7. Elle regroupe par device et sélecteur, puis émet dans cet ordre (`:443-462`) :

| Device | Media query | Paramètre |
|---|---|---|
| `d` | aucune | — |
| `l` | `@media only screen and (max-width: {laptop}px)` | option `tatsu_ui_settings.laptop_max_width` (1377 par défaut) |
| `t` | `@media only screen and (min-width:768px) and (max-width: {tablet}px)` | `tatsu_ui_settings.tablet_max_width` (1024 par défaut) |
| `m` | `@media only screen and (max-width: 767px)` | fixe |

8. Elle renvoie un `<style>…</style>` **inline dans le markup de chaque module**, que la fonction de rendu insère dans son HTML (par exemple `$custom_style_tag`, `modules/button.php:53`). La classe d'instance est `tatsu-{key}`, avec une clé générée par `be_uniqid_base36(true)` si elle est absente (`helpers.php:203`).

### 3.2 Règles côté éditeur (JavaScript, aperçu)

**[F]** Le module webpack 96 (`bundle.js:20265-20520`) :

- `getAttsBasedOnDisplay` (module 53) prend **la valeur du device courant** et, si elle manque, **toujours celle du desktop** (`getAttFromDisplay`, module 123). La cascade `l → t → m` est présente mais **en commentaire**.
- `selectorLoop` transforme `.tatsu-{UUID}` en clé `root` et retire le préfixe des autres sélecteurs. Il ne garde que le **premier** sélecteur d'une liste séparée par des virgules, puis le recopie sur les suivants (`jQuery.extend`).
- `validateCondition` gère `notempty`, `empty`, `=` et `!=` (avec un côté droit par device). Tout autre opérateur renvoie `false`.
- `getCSSValue` traite les couleurs et dégradés (`background-image` pour les fonds en dégradé, `border-image` pour les bordures, texte en dégradé via `-webkit-background-clip`), la typographie (via `window.typehub_font_options`), ainsi que `transform`, `transformX`, `transformY` et `translateY`. Il **ne traite ni `operation` ni `callback`** : aucune occurrence dans le module.
- `getConcatenatedCSS` (module 67) produit `{style, class}` par sélecteur. Les styles sont **appliqués inline** par les composants React intégrés ; les dégradés deviennent les classes `tatsu-gradient-text` et `tatsu-gradient-border`.
- Avant le calcul, `modifyAttsBeforeCSSCompute` (module 719) ajuste certains attributs.

### 3.3 Divergences PHP / JS et particularités difficiles à porter

| # | Particularité | Constat | Effet |
|---|---|---|---|
| D1 | Héritage entre breakpoints | **[F]** PHP : `l` (`max-width:1377`) s'applique aussi aux tablettes et aux mobiles, donc la valeur effective sur mobile est m, sinon l, sinon d. JS : device courant, sinon desktop | **[H]** l'aperçu et le site publié peuvent différer dès qu'une valeur laptop est définie sans valeur tablette ou mobile |
| D2 | Valeurs « 0 » | **[F]** PHP : `empty("0")` est vrai, donc **aucune règle émise** (`be-helpers.php:413`, `:416`). JS : `'0' != ''` est vrai, donc la règle est émise | **[H]** `padding: 0`, `border-width: 0` ou `z-index: 0` visibles dans l'aperçu et absents du site, ou l'inverse |
| D3 | `operation` et `callback` | **[F]** pris en compte en PHP seulement (`be-helpers.php:271`, `:315-332`) | marges de Row et overflow d'image différents dans l'aperçu |
| D4 | Dégradé de fond | **[F]** PHP : `background: …` ; JS : `background-image: …` | ordre de priorité CSS différent |
| D5 | `!important` | **[F]** JS supprime `append=' !important'` hors couleur ; PHP le garde | spécificité différente |
| D6 | Condition sur un attribut absent | **[F]** PHP l'ignore (`continue`) ; JS compare `undefined` | règles émises différemment |
| D7 | Sélecteurs multiples | **[F]** JS garde le premier sélecteur et le copie sur les autres ; PHP émet la clé complète, virgules comprises | équivalent en principe, **[H]** à vérifier avec `when` |
| D8 | Typographie | **[F]** PHP ajoute une pile de polices système, sauf pour les polices `standard` ; JS non | rendu de secours différent |
| D9 | CSS inline par instance | **[F]** un `<style>` par module | à consolider (voir §6) |
| D10 | Pré-transformations | **[F]** `z_index + 2` (JS, sections et colonnes), filtres PHP `*_before_css_generation`, `tatsu_*_remove_atts` dans les fonctions de rendu | à reproduire module par module |
| D11 | Breakpoints configurables | **[F]** `tatsu_ui_settings` pour laptop et tablette ; 768 et 767 fixés en dur | à paramétrer dans les tokens |

**[H]** Un moteur TypeScript peut reproduire le CSS **publié** (PHP) avec une **équivalence fonctionnelle**, c'est-à-dire les mêmes déclarations effectives par sélecteur et par media query. Le moteur est déterministe et ne lit que les attributs, le schéma, les tokens de couleur et de police et les breakpoints. Les seuls éléments à coder à la main sont les 6 callbacks et les pré-transformations D10. **[R]** La référence doit être le PHP (le site publié) et non le JS : on corrige ainsi D1 à D8 au lieu de les reproduire. Une égalité **octet par octet** n'est pas un objectif : on compare après normalisation.

### 3.4 Tests de non-régression proposés

**[R]** Approche *golden master* :

1. **Corpus.** **[F]** Les démos embarquées (`includes/demo-import/inc/importer/demo-files/*/content*.xml`) et les templates de sections (`includes/templates/website-templates/*/*.txt`) contiennent environ 765 `tatsu_section`, 1 139 `tatsu_row`, 1 703 `tatsu_column`, 1 152 `tatsu_image`, 253 `tatsu_button`, 2 981 `tatsu_inline_text` et 133 `tatsu_text`.
2. **Oracle PHP.** Sur une instance WordPress de référence, un script wp-cli parcourt les nœuds du corpus et produit pour chacun `{module, key, atts, css: be_generate_css_from_atts(...)}`. Avec les réglages `tatsu_ui_settings` et Colorhub figés, le résultat est versionné dans `fixtures/css/*.json`.
3. **Test TS.** `generateCss(schema, atts, key, tokens)` doit être **égal après normalisation** :
   - analyse avec PostCSS ;
   - tri des règles par (media, sélecteur) et des déclarations par propriété ;
   - normalisation des espaces, des couleurs (`rgba` vers une forme canonique) et des zéros.
4. **Échantillon minimal** (environ 200 cas) : `tatsu_section`, `tatsu_row`, `tatsu_column`, `tatsu_inner_row`, `tatsu_inner_column`, `tatsu_text`, `tatsu_inline_text`, `tatsu_image`, `tatsu_button`, `tatsu_icon`, `tatsu_divider`. Il doit couvrir au moins :
   - valeurs responsives partielles (D1) ;
   - valeurs « 0 » (D2) ;
   - `operation` et `callback` de Row (D3) ;
   - couleurs : palette, swatch, dégradé de fond, de bordure et de texte (D4) ;
   - typographie ;
   - `when` en `and` et en `or` ;
   - `!important` (D5) ;
   - sélecteurs multiples (D7).
5. **Visuel** (au niveau du POC) : Playwright à 1440, 1280, 900 et 375 px, avec comparaison de `getComputedStyle` sur une liste d'éléments repérés par classe et de captures d'écran à seuil, entre la page WordPress et la page Astro.

---

## 4. Axe 4 : réutilisation de l'interface

### 4.1 Stratégie A : adapter l'éditeur existant

**Principe.** On garde `bundle.js` tel quel. On fournit `tatsuConfig`, un endpoint qui répond aux actions AJAX, les substituts `wp.media` et TinyMCE, et une page d'aperçu statique. La sortie publiée est produite par Astro.

**Travail à prévoir [H] :**
- export des schémas (§2.3) ;
- backend simulé pour 16 actions ;
- substitut de `wp.media` (2 usages) ;
- TinyMCE 4 et `tinyMCEPreInit` ;
- page d'aperçu (`#tatsu-content-wrap`, CSS et JS publics de Tatsu) ;
- **rendu serveur HTML pour tous les modules non intégrés** (`tatsu_module`) ;
- **en plus**, le moteur CSS TypeScript et les composants Astro de sortie.

### 4.2 Stratégie B : reconstruire une interface moderne

**Principe.** Une nouvelle interface (React 19, Zustand + Immer avec patches pour l'undo/redo, dnd-kit, Tiptap pour l'inline, CodeMirror 6) génère son panneau à partir du **même schéma Zod**. L'aperçu utilise **les mêmes composants de rendu que la sortie Astro** et **le même moteur CSS**. Les workflows Tatsu documentés (§1.4 et `TATSU-ANALYSE.md` §5) servent de cahier des charges.

### 4.3 Comparaison

| Critère | A. Éditeur existant adapté | B. Interface moderne |
|---|---|---|
| **Complexité initiale** | Moyenne : pas d'UI à écrire, mais beaucoup de rétro-ingénierie du bundle compilé (formats attendus non documentés, effets de bord via le DOM de l'iframe : 184 accès `contentDocument`/`contentWindow`) | Élevée : environ 25 types de champs, moteur de conditions, arbre, DnD, inline, menu contextuel, historique |
| **Parité fonctionnelle à court terme** | Bonne (46 aperçus intégrés, menus, raccourcis, révisions) | Faible au départ, construite module par module |
| **Double rendu** | **Maintenu** : aperçu = templates React 15 + moteur JS (module 96) ; site = Astro + moteur TS, donc les divergences D1 à D8 restent | **Supprimé** : un seul composant et un seul moteur CSS |
| **Modules non intégrés (Oshine)** | Rendu serveur HTML obligatoire pour l'aperçu, en plus du rendu Astro (deux fois le travail) | Un seul composant par module |
| **Maintenance** | Très difficile : **aucun source** (seulement un `package.json` gulp à la racine) ; React 15.3.2, `createClass`, jQuery 3.1.0, react-dnd d'époque ; on modifie un fichier compilé de 5,6 Mo | Code source maîtrisé, dépendances à jour |
| **Sécurité** | Pas de mise à jour possible des dépendances intégrées au bundle | Normale |
| **Compatibilité des données** | Totale (même format) | Totale si on reprend le format `{name,id,atts,inner}` (§2.4) |
| **Licence** (voir `TATSU-ANALYSE.md` §15) | Redistribue du code GPL de Brand Exponents : le produit distribué devient GPL | Réimplémentation : aucun code repris |
| **Dette technique** | Maximale, et elle grandit à chaque ajout | Maîtrisée |
| **Risque principal** | Blocage sur un comportement interne non documenté du bundle | Glissement du périmètre (vouloir la parité totale) |
| **Ordre de grandeur [H]** | Spike 2 à 3 j ; intégration 3 à 5 semaines, **plus** la sortie Astro (la même qu'en B) | MVP de 6 modules (§5) : 4 à 6 semaines ; parité avec les environ 50 modules Tatsu : plusieurs mois |

### 4.4 Recommandation

**[R]** Choisir la stratégie **B**. Prévoir aussi un **spike A limité à 3 jours**, réservé à un **banc de référence** et jamais déployé. Il servirait à :
- confirmer l'hypothèse §1.5 ;
- observer les comportements de l'éditeur d'origine (formats exacts des nœuds produits, presets, `initial_children`, collage) ;
- produire des documents de test.

Les deux stratégies ont en commun l'export des schémas (§2.3), le moteur CSS TypeScript avec ses tests (§3.4) et les composants Astro. Ces trois éléments sont donc à réaliser en premier.

---

## 5. Axe 5 : démonstrateur (spécification seulement)

### 5.1 Périmètre

| Inclus | Exclu |
|---|---|
| Modules `tatsu_section`, `tatsu_row`, `tatsu_column`, `tatsu_text`, `tatsu_image`, `tatsu_button` | Inner rows, header/footer, sections globales, templates, révisions, formulaires |
| Attributs portant du CSS, environ 40 au total, dont : fond (couleur, image), padding et margin responsives, layout de row, largeur de colonne, texte (contenu, couleur, typographie), image (URL, alignement, largeur), bouton (texte, URL, couleurs normal et survol, taille, forme) | Animations, parallaxe, vidéo, séparateurs de forme, attributs dynamiques |
| 4 devices d'aperçu | Édition inline (le texte riche s'édite dans le panneau) |
| Images par URL | Médiathèque |

**[F]** Le corpus utilise surtout `tatsu_inline_text` (2 981 occurrences) plutôt que `tatsu_text` (133). **[R]** Il faut ajouter `tatsu_inline_text` si on veut charger des pages réelles sans perte.

### 5.2 Architecture minimale

```
packages/
  schema/        Schémas Zod (§2.4) + 6 fichiers JSON normalisés, issus de l'export wp-cli
  css-engine/    generateCss() : schéma + atts + key + tokens -> CSS avec media queries (§3.1)
  components/    6 composants JSX sans état (atts -> markup Tatsu, classes tatsu-{key})
apps/
  editor/        React 19 : arbre, panneau généré depuis group_atts, toggle device, iframe d'aperçu
  api/           GET/PUT /documents/:id (fichiers JSON), validation DocumentSchema
  site/          Astro : getStaticPaths sur /documents, rendu statique des composants (aucun JS client)
fixtures/
  documents/     2 à 3 pages extraites des démos (§3.4) converties en JSON
  css/           sorties PHP de référence
```

**[R]** Le rendu doit être identique dans l'éditeur et dans Astro. La solution la plus simple : écrire les composants en JSX (React ou Preact), puis :
- **les rendre statiquement dans Astro**, sans directive `client:*`, donc sans JavaScript livré ;
- **les rendre en direct dans l'iframe de l'éditeur**.

Dans les deux cas, le CSS vient de `css-engine` sous forme d'un `<style>` unique et consolidé par page.

**[H]** Alternative : les composants `.astro` avec l'API Container d'Astro côté serveur pour l'aperçu. Cela supprime le JSX mais impose un aller-retour serveur à chaque modification. Le statut de cette API est à vérifier dans la version d'Astro retenue.

### 5.3 Parcours à démontrer

1. `GET /documents/demo` charge un document JSON au format Tatsu (`{name,id,atts,inner}`), validé par Zod.
2. L'éditeur affiche la page dans l'iframe (section, row, column, texte, image, bouton).
3. Quand on sélectionne un module, le panneau (onglets, accordéons et champs issus de `group_atts` + `atts`, avec conditions `visible`/`hidden`) modifie l'attribut. L'aperçu et le CSS sont recalculés, y compris pour le device actif.
4. `PUT /documents/demo` enregistre le document modifié.
5. `astro build` produit la page statique à partir du même JSON.

---

## 6. Architecture proposée (cible)

```
┌─────────────── Éditeur (React moderne) ────────────────┐
│ Arbre / DnD │ Panneau généré (schéma) │ Toggle devices │
│        store (Immer + patches → undo/redo)             │
│  iframe d'aperçu : components/ + css-engine (live)     │
└───────────────┬────────────────────────────────────────┘
                │ JSON (DocumentSchema)          ▲ schémas, tokens
┌───────────────▼──────────────┐   ┌─────────────┴───────────────┐
│ API documents                │   │ packages/schema (Zod)       │
│ fichiers git ou CMS headless │   │ ← export wp-cli + normalis. │
│ (Payload, Directus…)         │   └─────────────────────────────┘
└───────────────┬──────────────┘
                │ build / SSR
┌───────────────▼──────────────────────────────────────────┐
│ Astro : components/ (rendu statique) + css-engine        │
│ → HTML + 1 CSS par page + JS front seulement si besoin   │
└──────────────────────────────────────────────────────────┘
Outils : convertisseur shortcodes → JSON (migration), oracle CSS PHP (tests)
```

**[R]** Les principes de cette architecture :
- un seul format de document ;
- un seul schéma par module ;
- un seul composant par module ;
- un seul moteur CSS ;
- des tokens (couleurs Colorhub, polices Typehub, breakpoints) sous forme de variables CSS ;
- le comportement JavaScript front de chaque module chargé seulement quand le module est présent.

---

## 7. Matrice des dépendances

| Dépendance | Type | Référence | Requise par A | Requise par B | Remplacement |
|---|---|---|---|---|---|
| `tatsuConfig` (contenu + schémas) | globale JS injectée par PHP | `class-tatsu-builder.php:245-280` | oui | non | A : JSON statique ; B : `GET /registry`, `GET /documents/:id` |
| `admin-ajax.php` (16 actions) | HTTP | §1.2 | oui | non | A : endpoint simulé ; B : API REST propre |
| Nonce et droits WP | PHP | `class-tatsu-builder.php:189`, `:260` | oui (factice) | non | authentification du backend |
| `wp.media` | JS WP | `bundle.js:82282`, `:82963` | oui (substitut) | non | service média |
| TinyMCE + `tinyMCEPreInit`, `quicktags` | JS WP | `class-tatsu-frame.php:151`, `bundle.js:83678-83691` | oui | non | Tiptap |
| Page d'aperçu WordPress et thème | PHP et thème | `class-tatsu-frame.php:31-154` | oui (page statique) | non | iframe et composants partagés |
| `tatsu-frame.js` (postMessage) | JS Tatsu | `builder/js/tatsu-frame.js:161-300` | oui | non | protocole propre |
| Rendu serveur `do_shortcode` (`tatsu_module`) | PHP | `rest_api/class-tatsu-module.php:21-75` | oui, pour les modules non intégrés | non | composants partagés |
| Typehub (`typehub_font_options`, `typehub_selectors`) | globale et PHP | module webpack 96, `includes/typehub/` | oui | non | tokens de typographie |
| Colorhub (`colorhub`, `be_compute_color`) | globale et PHP | `bundle.js:31449`, `be-helpers.php:65` | oui | non | tokens de couleur |
| `WebFont` (CDN Google) | externe | `class-tatsu-builder.php:244` | oui | optionnelle | chargement de polices auto-hébergées |
| jQuery 3.1.0 | intégré au bundle | module webpack 4 | oui | non | — |
| React 15.3.2, `createClass`, Redux, Immutable, react-dnd | intégré au bundle | `bundle.js:71869` | oui | non | React 19, Zustand/Immer, dnd-kit |
| `get_shortcode_regex` (templates, collage, migration) | PHP WP | `class-tatsu-content-parser.php:28-41` | oui | non | parseur TS |
| Révisions WP | PHP WP | `helpers.php:1345` | oui | non | historique git ou CMS |
| Attachements WP (`wp_get_attachment_image_src`, `srcset`) | PHP WP | rendu `single_image.php` | — | non | URL + dimensions dans les attributs |
| Options `tatsu_ui_settings` (breakpoints) | PHP | `be-helpers.php:395-455` | oui | non | tokens |
| Listes dynamiques (menus, sidebars, posts, termes) | PHP WP | §2.2 | oui | selon les modules | `optionsSource` fournie par le CMS |
| Runtime front (`public/js/tatsu.js` + vendors : Flickity et Isotope en GPLv3) | JS | `public/js/` | oui (aperçu) | seulement pour les modules qui l'exigent | JS natif par module |

---

## 8. Principaux risques techniques

| # | Risque | Probabilité | Impact | Mesure |
|---|---|---|---|---|
| R1 | Divergence entre l'aperçu et le site publié (D1 à D8) reprise par inadvertance | élevée (A), faible (B) | élevé | moteur CSS unique ; oracle PHP (§3.4) |
| R2 | L'export wp-cli ne déclenche pas tous les enregistrements (contexte admin, thème inactif, conditions `is_tatsu_pro_active` ou `be_theme_name`) | moyenne | moyen | exporter avec Oshin actif **et** en mode autonome, puis comparer les listes de modules |
| R3 | Les 6 callbacks et les pré-transformations réécrits de travers | moyenne | moyen | cas dédiés dans les tests golden |
| R4 | Les modules Oshine dépendent de requêtes WP (portfolio, blog, termes) | certaine | élevé pour la migration | les sortir du POC ; prévoir des sources de données propres au CMS |
| R5 | Le bundle d'origine dépend de comportements non documentés (DOM de l'iframe, `postMessage` en chaînes) | élevée | élevé (A) | stratégie A limitée au banc de test |
| R6 | Le markup des fonctions de rendu PHP (classes, structure) diffère des composants réécrits, et le CSS du thème et de Tatsu (`tatsu.css`, `oshin/css/main.css`) ne correspond plus | moyenne | élevé | reprendre le markup PHP à l'identique pour le POC ; tests `getComputedStyle` |
| R7 | Données héritées : attributs JSON entre apostrophes dans les shortcodes (`helpers.php:208`), `htmlspecialchars` sur `text` (`:211`), contenu non Tatsu enveloppé automatiquement (`Tatsu_Parser::wrap_content`) | élevée | moyen | convertisseur testé sur tout le corpus de démos |
| R8 | Références de couleur et de police perdues à l'export (valeurs résolues au lieu de `palette:N`) | moyenne | moyen | normaliser en références (§2.3) |
| R9 | Licence : la stratégie A redistribue du code GPL, et le runtime front repose sur Flickity et Isotope (GPLv3 ou licence commerciale) | — | juridique | stratégie B ; remplacer ces librairies |
| R10 | Glissement du périmètre vers la parité complète (environ 50 modules Tatsu + 45 Oshine) | élevée | planning | périmètre MVP gelé (§5.1), ajout de modules uniquement sur la base du schéma |

---

## 9. Critères objectifs de validation du POC

| # | Critère | Mesure | Seuil |
|---|---|---|---|
| V1 | Indépendance vis-à-vis de WordPress | aucune requête vers `/wp-*` ni `admin-ajax` ; aucune dépendance PHP | 0 |
| V2 | Chargement | les documents de test (2 à 3 pages des démos, convertis) passent `DocumentSchema.parse` et s'affichent | 100 % |
| V3 | Fidélité des données | chargement puis enregistrement sans modification : JSON identique (égalité profonde) | 100 % |
| V4 | Édition | chaque attribut du périmètre (§5.1) modifié dans le panneau est reflété dans l'aperçu | 100 % des attributs |
| V5 | Réactivité | délai entre un changement d'attribut et le rendu de l'aperçu | < 100 ms (p95) sur un document de 50 nœuds |
| V6 | Conditions d'interface | les champs `visible`/`hidden` apparaissent et disparaissent comme dans le schéma | cas testés unitairement |
| V7 | Équivalence CSS | sorties de `generateCss` égales, après normalisation, à l'oracle PHP sur l'échantillon (§3.4) | ≥ 98 % des cas ; chaque écart documenté |
| V8 | Équivalence aperçu / sortie | même HTML (après normalisation) et même CSS entre l'iframe de l'éditeur et la page Astro | identique |
| V9 | Équivalence avec le site WordPress | `getComputedStyle` sur les éléments repérés à 1440, 1280, 900 et 375 px | ≥ 95 % des propriétés égales |
| V10 | Sortie statique | page Astro sans JavaScript pour les 6 modules ; un seul fichier CSS | 0 Ko de JS |
| V11 | Extensibilité | ajouter un 7e module (ex. `tatsu_divider`) avec seulement un schéma et un composant, sans toucher à l'éditeur | réalisé |

---

## 10. Récapitulatif des hypothèses à vérifier en priorité

1. **[H]** L'éditeur d'origine fonctionne avec `tatsuConfig` + un endpoint simulé + des substituts (§1.5) : spike A de 3 jours.
2. **[H]** `wp eval` sous wp-cli déclenche `wp_loaded` et donc l'enregistrement complet des modules (§2.3) : 1 heure sur une instance de test.
3. **[H]** Les divergences D1 et D2 ont un effet visible sur le corpus (§3.3) : à confirmer par l'oracle PHP comparé au moteur JS.
4. **[H]** Le markup des 6 modules du POC peut être repris tel quel en JSX sans dépendance WordPress (§5) : à vérifier en lisant les fonctions de rendu `tatsu_section`, `tatsu_row`, `tatsu_column`, `tatsu_text`, `tatsu_image` et `tatsu_button`.
