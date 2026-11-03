# ADR-0023 — CSS personnalisé : feuille du projet et classes

**Statut :** Accepté le 02/11/2026 · **Date :** 02/11/2026 · **Réf. :** CLAUDE §5, §6, §8 et §9, ADR-0002, ADR-0009, ADR-0010, ADR-0017, ADR-0018, `docs/research/essai-import-tatsu.md`

## Contexte

Le Studio exclut aujourd'hui tout CSS saisi à la main (guide, annexe A : « exclu par conception »). Chaque réglage passe par l'inspecteur, ce qui garantit trois choses :

- **la sécurité** : aucun contenu libre n'atteint la prévisualisation ni l'export ;
- **la fidélité** : le canvas et l'export rendent le même CSS, généré par `toCss` ;
- **la qualité** : accessibilité et responsive, vérifiés par le banc.

Cette règle a un coût pour le designer d'un projet. Sur le site Tatsu essayé, 6 éléments reposent sur des classes du thème (`fold3d`, `rightbutt`, `upbutt`) et plusieurs effets n'ont pas encore d'équivalent dans le Studio (parallaxe, inclinaison 3D, zoom lent). Chaque besoin ponctuel attend aujourd'hui un nouveau réglage ou un nouveau composant.

Il s'agit d'ouvrir une porte encadrée, réservée au designer du projet, sans renoncer à ces trois garanties.

## Décision

1. **Deux ajouts au modèle, facultatifs** : pas de changement de `schemaVersion`, puisqu'un document sans eux reste valide.
   - `site.customCss` : la feuille de style du projet, au plus 64 Ko.
   - `node.classes` : au plus 8 classes par élément, de la forme `[a-z][a-z0-9-]{0,39}`. Le préfixe `ns-` est réservé au Studio et refusé.

2. **Les classes personnalisées sont le seul point d'accroche garanti.** Les classes `ns-<id>` et les classes internes des composants (`ns-carousel-track`…) ne sont pas une API publique et peuvent changer. L'éditeur avertit quand la feuille les cible, sans le refuser.

3. **La feuille est analysée, jamais insérée telle quelle.** L'analyse passe par un analyseur CSS déclaré en dépendance directe (lightningcss, déjà présent par Vite ; licence MPL-2.0, sans effet sur les sites exportés, qui ne l’embarquent pas), côté serveur à l'enregistrement et côté Studio à la saisie. Elle refuse :
   - `@import`, `@charset`, `@namespace` ;
   - `url()` hors médiathèque. Les seules références admises sont `url("ns-asset:<id>")`, résolues comme les images de fond (ADR-0017) et comptées dans les usages du média (retrait refusé tant qu'il est utilisé) ;
   - `@font-face` : les polices passent par les polices importées (ADR-0018) ;
   - `expression()`, `-moz-binding`, `behavior` et tout ce qui ne se ré-sérialise pas à l'identique.

   La feuille publiée est **la sortie de l'analyseur**, pas le texte saisi. Une séquence `</style>` ou un commentaire piégé ne peut donc pas traverser. Une feuille invalide n'est pas enregistrée : l'erreur est indiquée à la ligne près, et le document reste inchangé.

4. **Confinement par couche.** La feuille est émise dans `@layer ns-custom`, déclarée après la couche des styles générés.
   - L'ordre de priorité est prévisible : le CSS personnalisé l'emporte sur les styles du Studio, quel que soit l'ordre des fichiers.
   - `!important` reste possible, mais l'éditeur le signale.

   Le canvas est déjà une iframe : la feuille ne peut pas atteindre l'interface de l'éditeur. Les surcouches de sélection restent hors du DOM du document (CLAUDE §6).

5. **Mêmes règles dans le canvas et à l'export.** Le canvas et l'aperçu injectent la feuille analysée dans la même couche. L'export la publie dans `src/styles/custom.css`, importée après les styles de page et décrite dans le README. Le site reste lisible et réversible.

6. **Commandes structurées** : `setProjectCss` et `setNodeClasses`. Elles bénéficient de l'annulation, du journal et, plus tard, des mêmes droits et validations pour l'IA (CLAUDE §8). Une frappe dans l'éditeur de code est une transaction, close à la sortie du champ.

7. **Interface.**
   - Un panneau **CSS du projet** : zone de code à police fixe (une zone de texte d'abord), erreurs et avertissements par ligne, aperçu en direct dans le canvas.
   - Un champ **Classes CSS** dans la section Avancé de l'inspecteur.

8. **Avertissements de qualité, non bloquants** :
   - `outline: none` ou `outline: 0` sans règle `:focus-visible` ;
   - `display: none` ou `visibility: hidden` hors media query ;
   - animations ou transitions sans `prefers-reduced-motion` dans la feuille ;
   - sélecteurs ciblant des classes `ns-` ;
   - `!important`.

   Le banc d'accessibilité (axe) reste la vérification de référence.

9. **Droits.** Tant que le Studio n'a pas de rôles, toute l'équipe connectée peut modifier la feuille ; c'est acceptable sur une instance privée (ADR-0016). Quand les rôles arriveront, ce sera une permission du designer, journalisée. Un futur client éditeur de contenu ne l'aura pas.

## Alternatives écartées

- **CSS libre sans analyse** : injection possible dans la prévisualisation et l'export, ressources tierces chargées à l'insu (Schrems II), aucune garantie de fidélité.
- **CSS propre à chaque élément, limité automatiquement à l'élément** : utile, mais disperse le style dans des centaines de nœuds, difficile à relire et à maintenir. La feuille du projet et les classes couvrent les besoins observés ; à reconsidérer sur un besoin réel.
- **Classes utilitaires et variables CSS prédéfinies seulement** : plus sûr, mais ne répond pas au besoin d'un designer (effets, sélecteurs, états).
- **Assainissement par expressions régulières** : contournable ; seul un analyseur ré-sérialisant donne une garantie.

## Conséquences

- Le principe « pas de CSS personnalisé » devient « pas de CSS personnalisé non contrôlé ». Le guide (annexe A et un nouveau chapitre ou une nouvelle section) et `docs/limitations.md` sont mis à jour.
- Banc de fidélité : une fixture avec une feuille personnalisée (classes, `@media`, `url("ns-asset:…")`, état `:hover`). Tests de refus : `@import`, `url()` externe, `@font-face`, `</style>`, préfixe `ns-` dans les classes.
- Le convertisseur Tatsu pourra reporter les classes du thème (`fold3d`…) sur les éléments ; la feuille correspondante reste à écrire par le designer, sans copie du CSS d'Oshine.
- Risque assumé : une feuille personnalisée peut dégrader l'accessibilité ou le responsive d'un site. Les avertissements et le banc le signalent, ils ne l'empêchent pas.
- Dette : les classes internes des composants pourront évoluer ; une feuille qui les cible malgré l'avertissement pourra casser à une mise à jour.
- Une dépendance directe de plus (l'analyseur CSS), dont la licence et les correctifs sont à suivre (CLAUDE §8).

## Addendum du 02/11/2026 — implémentation

- **Analyseur : css-tree (MIT, 3.2.1) au lieu de lightningcss.** lightningcss est un module natif : il ne s'exécute pas dans le navigateur, où le Studio valide chaque document (canvas, aperçu). css-tree est en JavaScript pur et sert partout : Studio, serveur (`loadSite`) et export. La garantie est la même : la feuille publiée est la sortie de `generate()`, jamais le texte saisi. Sont aussi refusés : les échappements dans les noms (`\75rl(`), les fonctions qui chargent une ressource depuis une chaîne (`src()`, `image()`, `image-set()`, `cross-fade()`), le caractère `<` dans une chaîne, et toute syntaxe non reconnue. Les propriétés personnalisées (`--x`) sont analysées comme des valeurs, donc vérifiées elles aussi.
- **Couches.** Une feuille dans une couche perd face aux styles hors couche. Les styles générés (`toCss`) passent donc dans la couche `ns`, déclarée avant `ns-custom` (`@layer ns,ns-custom;`). Le canvas et l'aperçu n'ont pas d'autre feuille ; les vignettes de sections sont rendues dans un shadow DOM, sans la feuille du projet.
- **Médias.** `url("ns-asset:<id>")` est résolu vers `/media/<fichier>` (servi tel quel, comme les images de fond) ; la médiathèque refuse le retrait d'une image utilisée par la feuille. Le panneau propose d'insérer une image de la médiathèque.
- Les commandes `setProjectCss` et `setNodeClasses` demandent la permission `design`, accordée à l'assistant IA : ses propositions passent par la même validation et la revue humaine des différences.
- Le convertisseur Tatsu reporte les classes de section et de colonne du thème (`fold3d`…) sur les éléments.
- **Coloration syntaxique** sans dépendance supplémentaire : le tokeniseur de css-tree colore une copie (`<pre aria-hidden>`) placée sous un `<textarea>` au texte transparent, qui reste le vrai contrôle (clavier, lecteurs d'écran, annulation du navigateur). Le test e2e vérifie l'alignement des deux.
- **Export sans minification CSS** (`vite.build.cssMinify: false`). Le minificateur réécrivait certaines valeurs (`right top` en `100% 0`, `background: transparent` en `background: 0 0`) : même rendu, mais valeurs calculées différentes de celles du Studio, que le banc de fidélité détectait. Le CSS généré est déjà compact ; la feuille du projet garde ses retours à la ligne.
