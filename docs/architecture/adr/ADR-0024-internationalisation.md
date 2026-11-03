# ADR-0024 — Internationalisation : catalogues de messages, anglais par défaut

**Statut :** Accepté le 03/11/2026 · **Date :** 03/11/2026 · **Réf. :** CLAUDE §4, §5 et §8, ADR-0005, ADR-0013, ADR-0014, ADR-0016

## Contexte

Le dépôt est public sous licence Apache-2.0 depuis le 03/11/2026. Le Studio a été conçu en français : le code, les identifiants et les commentaires sont déjà en anglais, mais tout ce que lit un utilisateur est en français et écrit en dur dans le code.

Mesure faite sur `main` :

| Zone | Chaînes en français |
|---|---|
| Interface du Studio (`apps/studio/src`) | ~400 : libellés, `aria-label`, `title`, messages |
| Inspecteur et composants (`packages/components`) | ~90 : noms des champs et des composants, presets de sections |
| Cœur (`packages/core`) | ~170 : validation (y compris les messages des schémas zod), contrôles avant export, catalogue de commandes, prompt système de l'IA |
| API (`apps/studio/dev-server`) | ~50 : erreurs, assistant simulé |
| Export Astro | ~20 : README et commentaires générés, page 404, README des redirections |
| Locale codée en dur | `<html lang="fr">` (3 pages du Studio), `toLocaleString('fr-FR')` (2 appels) |

Les tests e2e retrouvent les éléments par leur nom accessible français (~350 sélecteurs). Les diagnostics portent déjà un `code` stable à côté du `message` (`Diagnostic`, `Check`).

Deux publics à servir : les graphistes français qui utilisent le Studio aujourd'hui, et une communauté internationale qui le lira, le testera et le traduira. Ajouter une langue doit se faire sans modifier le code.

## Décision

1. **Anglais par défaut, français conservé.** L'anglais est la langue de référence de l'interface, des messages et de la documentation destinée aux contributeurs. Le français reste une langue complète et maintenue. Toute autre langue est une contribution.

2. **Catalogues JSON, séparés du code.**
   - Un fichier par langue : `packages/core/src/i18n/locales/<langue>.json` (`en.json` fait référence, `fr.json`…), partagé par le Studio, le serveur et l'export.
   - **Format JSON d'i18next (v4)** : clés imbriquées par domaine (`shell.*`, `inspector.*`, `checks.*`, `commands.*`, `ai.*`, `api.*`, `content.*`), interpolation `{{nom}}`, pluriels par suffixe de catégorie CLDR (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`). Ce format est accepté tel quel par les plateformes de traduction collaborative (Weblate, Crowdin) : un traducteur travaille sans toucher au code.
   - Pas de HTML dans les messages. Une mise en forme dans une phrase (lien, gras) se compose dans le code autour de messages distincts.

3. **Un module maison, sans dépendance** (`packages/core/src/i18n/index.ts`, de l'ordre de 50 lignes, sans React) :
   - `t(key, params?)` : recherche dans la langue active, puis en anglais ; une clé absente partout affiche la clé elle-même et lève une erreur en test.
   - Pluriels par `Intl.PluralRules`, dates et nombres par `Intl.DateTimeFormat` et `Intl.NumberFormat`, avec la langue active.
   - Les catalogues sont importés en JSON (`with { type: 'json' }`, compris par Node et Vite) depuis un registre `locales/index.ts`. **Ajouter une langue = un fichier JSON et une ligne dans ce registre.** La liste des langues proposées à l'utilisateur en découle.
   - Clés typées depuis `en.json` : une clé inexistante dans le code est une erreur de typecheck.
   - Le format étant celui d'i18next, passer à cette bibliothèque reste possible sans retraduire, si un besoin réel l'impose (chargement à la demande, formats plus riches).

4. **Le cœur produit des codes, l'interface les traduit.**
   - Validation, contrôles avant export, résultats de commandes et erreurs de l'API renvoient `{ code, params }`. Le `message` disparaît des contrats, ou n'est plus qu'une aide au débogage en anglais.
   - Les messages personnalisés des schémas zod deviennent des codes de la même façon.
   - Les clients futurs (IA, serveur MCP, CLI) reçoivent des codes stables et traduisent eux-mêmes, ou affichent l'anglais.

5. **Deux langues distinctes : l'interface et le site.**
   - **Langue de l'interface** : propre à chaque utilisateur. Par défaut la langue du navigateur si elle est disponible, sinon l'anglais ; modifiable dans le Studio et retenue dans le navigateur (`localStorage`). Elle fixe `<html lang>` et le formatage des dates. Rien n'est enregistré côté serveur : le Studio n'a pas de comptes (ADR-0016).
   - **Langue du site** : `settings.lang`, déjà dans le modèle. Elle fixe tout ce qui finit dans le site : contenu par défaut d'un composant inséré, presets de sections, page 404, textes accessibles générés (`content.*`). Une langue de site sans catalogue `content.*` retombe sur l'anglais.
   - Un graphiste peut donc travailler dans une interface anglaise sur un site en français, et l'inverse.

6. **Export.** Le README, les commentaires générés et le README des redirections sont en anglais : ils s'adressent aux développeurs. Les textes visibles du site suivent la langue du site.

7. **Assistant IA.** Le prompt système est en anglais. Il demande de répondre dans la langue de l'interface et d'écrire le contenu dans la langue du site, toutes deux transmises dans la requête. Les actions rapides (« Résume ce contenu »…) deviennent des clés du catalogue.

8. **Guide d'utilisation.** Starlight gère nativement plusieurs langues : l'anglais à la racine (`/guide/`), le français sous `/guide/fr/`. Une page non traduite s'affiche en anglais avec un bandeau. `npm run guide:screenshots` produit les captures dans chaque langue de l'interface.

9. **Contrôles automatiques.**
   - Un test compare chaque catalogue à `en.json` : clés manquantes, clés en trop, paramètres `{{…}}` différents. Il bloque pour `fr` et avertit pour les autres langues, pour qu'une traduction partielle puisse être fusionnée.
   - Un test signale les clés de `en.json` qui ne sont plus utilisées.
   - Les tests e2e tournent en anglais ; un parcours court vérifie le changement de langue en français.

10. **Migration en lots**, chacun testable et démontrable :
    1. ce module, le choix de la langue, `<html lang>` et les dates ; extraction des chaînes de l'interface avec le **français comme langue active**, pour que les tests e2e restent inchangés ;
    2. codes dans le cœur et les composants, catalogue `content.*`, prompt de l'IA ;
    3. export et versions anglaises des modèles de site écrits en code ;
    4. passage de l'interface à l'anglais par défaut, avec mise à jour des tests e2e et unitaires ;
    5. documentation destinée aux contributeurs en anglais (README, CLAUDE.md, CONTRIBUTING, SECURITY, déploiement, limites, ADR, spécifications) ;
    6. guide bilingue.

    Les démonstrations et le banc (`npm run demo`, `demo:site`, `demo:creative`, `test:fidelity`) restent verts à chaque lot. Les fixtures gardent leur contenu français : ce sont des données de test.

## Alternatives écartées

- **Traduire en anglais sans internationaliser** : moins de travail immédiat, mais les utilisateurs actuels perdent leur langue, et chaque nouvelle langue repasserait sur tout le code.
- **i18next, react-intl ou FormatJS dès maintenant** : éprouvés, mais apportent des dépendances (et pour react-intl, un couplage à React incompatible avec le cœur) pour un besoin couvert par `Intl` et quelques lignes. Le choix du format d'i18next garde cette porte ouverte.
- **ICU MessageFormat** (`{count, plural, one {…} other {…}}`) : plus expressif, mais demande un analyseur (dépendance) et reste moins lisible pour un traducteur occasionnel. Les besoins mesurés (interpolation simple, quelques pluriels) n'en justifient pas le coût.
- **Catalogues en TypeScript** : typage direct, mais illisibles pour les plateformes de traduction et pour les traducteurs non développeurs.
- **Clés = phrase anglaise** (à la gettext) : pas de fichier anglais à maintenir, mais toute correction d'une phrase anglaise invalide toutes les traductions.
- **Une seule langue pour l'interface et le site** : empêche le cas courant d'une agence qui travaille dans sa langue pour un client qui en a une autre.

## Conséquences

- Plus aucun texte destiné à l'utilisateur dans le code : une revue refuse une chaîne en dur. CLAUDE.md l'énonce comme règle.
- Toute fonctionnalité visible ajoute ses clés dans `en.json` et `fr.json`, comme elle met à jour le guide aujourd'hui.
- Les contrats du cœur changent (`message` → `code` + `params`) : les consommateurs (Studio, API, IA, scripts de démonstration) sont adaptés dans le même lot.
- Le guide double de volume à entretenir (environ 18 000 mots par langue).
- Les rapports de tranches, études et recherches (environ 38 000 mots) restent en français, déplacés dans `docs/history/` avec un index en anglais. Ils sont traduits seulement à la demande.
- Les fichiers de documentation et d'ADR prennent des noms anglais au lot 5 ; les liens sont vérifiés par `npm run check`.
- Limite connue : les langues écrites de droite à gauche ne sont pas prises en charge. Il faudra auditer le CSS du Studio (propriétés logiques, icônes directionnelles) avant d'en accepter une.
- Risque : une traduction communautaire de mauvaise qualité ou malveillante. Les catalogues ne contiennent que du texte, sans HTML, et passent par une PR relue comme le code.
