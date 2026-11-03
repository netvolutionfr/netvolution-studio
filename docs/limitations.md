# Limites connues — jalons 1 à 3

**État au 02/11/2026.** Limites acceptées pour les jalons livrés et les évolutions qui ont suivi ; certaines relèvent d'évolutions futures.

## Évolutions du 31/10 au 02/11/2026

- Bordures, ombres, dégradés et images de fond (ADR-0017) : une ombre et une image de fond par élément, bordure sur les quatre côtés à la fois ; images de fond publiées sans optimisation (avertissement au-delà de 500 Ko) ; pas de token dans les couleurs d'ombre et de dégradé.
- Polices importées (ADR-0018) : WOFF2 seulement ; catalogue de 25 polices libres en jeu latin ; la licence d'une police importée à la main reste à vérifier par l'utilisateur.
- Composant Liste : puces ou numéros, un niveau, éléments en texte enrichi.
- Typographie fine, éléments collants et retours à la ligne (ADR-0019, 01/11/2026). Texte enrichi (ADR-0020) : paragraphes, couleur par passage (valeur littérale, sans token), titres enrichis, texte en dégradé sur tout l'élément ; pas de taille ni de fond sur une partie d'un texte, ni d'intertitre ou de liste dans un texte.
- Galerie (ADR-0021) : mosaïque en colonnes CSS (ordre visuel par colonne), vignettes, agrandissement au clic ; pas de filtres par catégorie, de chargement progressif ni de diaporama automatique.
- Bandeau défilant et carrousel (ADR-0022) : bandeau de textes ou d'images en CSS (pas de vitesse au survol ni de défilement lié au scroll) ; carrousel d'images seulement (pas de diapositive composée, de points de pagination ni de fondu).
- CSS personnalisé (ADR-0023) : une feuille par projet (64 Ko) et 8 classes par élément ; pas de CSS propre à un élément ni de @font-face, @import ou ressource externe ; la feuille ne s'applique pas aux vignettes de la bibliothèque de sections ; éditeur à coloration syntaxique simple (sans complétion ni repli).

## Jalon 3 livré

- Assistant IA (ADR-0014) : propositions en un seul tour, revues sous forme de diff sans aperçu dans le canvas ; qualité non évaluée avec un modèle réel ; compteurs de quotas en mémoire, sans comptes ; pas de diffusion en continu ; fournisseurs réels vérifiés contre des serveurs factices.

- Composants réutilisables : paramètres adressés par chemin (réordonner une définition peut les déplacer), liste de paramètres fixée à la création, mise à jour résumée sans diff détaillé, sections enregistrées propres au projet.
- Services : journal limité à la session (ni persistance, ni annulations consignées) ; diff global pour les champs du site (tokens, menus…).
- Composition : poignées et guides à la souris seulement (les champs de l'inspecteur couvrent le clavier) ; pas de sélection multiple ni de poignée de rotation.
- Animations : un seul jeu de transitions de survol/focus par élément (elles se composent désormais avec les transformations) ; le mouvement réduit simulé dans le canvas ne coupe pas les transitions CSS ; pas d'éditeur de courbe ni de chronologie.
- Modèles de site : nom et description saisis par `prompt`, sans vignette ; partage entre installations par copie de fichier.

## Jalon 2 livré

- Projets, pages, design tokens, menus, header/footer, aperçu du site, médiathèque et composants enrichis, SEO, contrôles avant export, export complet (404, sitemap, robots, redirections, build statique) et archive disponibles. Démonstration : `npm run demo:site`.
- Composants : vidéo YouTube/Vimeo seulement (pas de fichier local), 20 icônes, pas de formulaire ; un accordéon fermé s'édite via « Ouvert » ou l'arborescence.
- Médiathèque : pas de dossiers, de remplacement de fichier ni de nettoyage des orphelins (polices : voir les évolutions du 31/10/2026). Le banc ne compare plus les pixels des images, optimisées au build (ADR-0010).
- Navigation : un niveau de sous-menu, pas de fermeture par Échap ; le menu replié s'ouvre dans le flux. Un seul header et un seul footer dans l'interface.
- Export : build statique lancé dans la requête (réseau requis, sans progression) ; pas de ZIP ; pas de contrôle de contraste dans le Studio ; sitemap et URL absolues seulement si l'URL du site est définie.
- Corbeille (`data/trash/`) jamais vidée par le Studio, sans restauration depuis l'interface.
- Les documents du jalon 1 (`data/documents/`) s'importent depuis l'écran Projets ; leurs médias (`data/media/`) ne sont pas repris.

## Édition

- **Texte enrichi.** Un seul paragraphe, avec gras, italique et lien. Les liens se saisissent via `prompt()`. L'éditeur repose sur `execCommand`, déprécié mais universellement supporté. Les listes passent par le composant Liste (un niveau, sans sous-liste) ; pas de titres en ligne.
- **Glisser-déposer.** Les éléments ne s'attrapent pas directement dans le canvas (on passe par l'arborescence ou la bibliothèque), et il n'y a pas de défilement automatique pendant un glissement.
- **Presse-papiers** interne à l'onglet du Studio. Pas d'échange avec le presse-papiers système, ni de collage entre documents : un média absent du document cible est refusé.
- **Inline editing** dans le canvas absent : les textes s'éditent dans l'inspecteur.
- **Design tokens** (ADR-0009) : pas de tokens d'ombre ni de breakpoints éditables ; polices importées en WOFF2 seulement (ADR-0018) ; police et graisse des styles de texte réglables en base seulement dans le panneau.
- **Breakpoints.** Le modèle accepte un nombre quelconque de breakpoints, mais l'interface ne permet pas encore d'en créer : desktop, tablette et mobile sont fournis par les modèles.

## Persistance et médias

- **Pas d'authentification dans le Studio.** En local, l'API passe par le serveur Vite sur 127.0.0.1. Hébergé (ADR-0015, `deploy/README.md`), le Studio tourne dans un conteneur derrière nginx, qui fournit HTTPS et le mot de passe : toute personne connectée a tous les droits, sans comptes ni rôles.
- **Médias.** Un dossier par projet (`data/projects/<id>/media/`). Pas de nettoyage des fichiers orphelins. Images raster optimisées au build de l'export (WebP, `srcset`), SVG et fichiers copiés tels quels.
- **Dimensions des images** mesurées par le navigateur ; le serveur n'en vérifie que la forme.
- **Fermeture d'onglet.** Pas de brouillon local : la protection est `beforeunload`.

## Langues (ADR-0024)

- **Interface, contenu généré et export traduits.** Le Studio, les composants, les messages du cœur et du serveur passent par les catalogues `packages/core/src/i18n/locales/` ; l'interface s'ouvre dans la langue du navigateur si elle a un catalogue, sinon en anglais. Le contenu que le Studio écrit dans un site (texte par défaut d'un élément, sections, header et footer, nouvelle page, page 404, textes accessibles du carrousel, de la galerie et du bandeau) suit la langue du site (`settings.lang`), l'anglais si elle n'a pas de catalogue. Les fichiers destinés aux développeurs dans l'export (README, `MEDIA.md`, `redirects/README.md`, commentaires) sont en anglais.
- **Modèles de site** : Studio Orbe et Cabinet Valéor existent en français et en anglais ; **Atelier Nord** (archive, pas écrit en code) et les pages de départ restent en français. Une autre langue s'ajoute par un dictionnaire `templates/translations/<modèle>.<langue>.json`.
- **Assistant simulé** (démonstrations et tests) : il reconnaît les consignes en français et en anglais, mais ses réponses et le contenu qu'il propose restent en français.
- **Messages des schémas** : les messages propres à zod (types, longueurs) restent en anglais, quelle que soit la langue ; seuls les messages écrits pour le Studio sont traduits.
- **Changement de langue** par rechargement de la page ; le choix est retenu dans le navigateur (`localStorage`), pas côté serveur.
- **Langues écrites de droite à gauche** non prises en charge.

## Rendu et export

- **Fidélité** mesurée sous **Chromium uniquement**, sur une machine, avec les polices système. Firefox, WebKit et les polices web ne sont pas couverts.
- **Composants exportés** en `.tsx` rendus par Astro au build (ADR-0002) ; React n'est pas livré au navigateur. Un export « 100 % `.astro` » nécessiterait une autre stratégie (S2).
- **Envoi au canvas.** Le document complet est envoyé à chaque modification ; il n'y a pas de mesure sur une grande page (R9).
- **Isolation.** L'iframe du canvas utilise `allow-same-origin` (contrainte du serveur Vite, R3) : pas d'isolation de sécurité vis-à-vis du shell.
- **Lisibilité de l'export.** Les classes CSS exportées sont dérivées des identifiants (`ns-<id>`), sans noms sémantiques.

## Accessibilité

- **Contrôle automatisé** par axe-core (règles WCAG 2.1 A/AA, violations graves) sur les pages exportées et sur l'éditeur. Une revue humaine reste nécessaire (CS-12).
- **Éditeur.** Le glisser-déposer n'a pas d'équivalent clavier direct : il faut couper, sélectionner la cible, puis coller. Les déplacements au sein d'un même parent passent par Monter et Descendre.
