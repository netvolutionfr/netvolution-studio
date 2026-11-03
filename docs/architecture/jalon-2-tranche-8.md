# Jalon 2 — Tranche 8 : démonstration et bilan du jalon

**Date :** 30/10/2026 · **Périmètre :** spécification 02 §6 (démonstration) et §7 (Definition of Done) · **Statut :** livré, validé le 30/10/2026

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| **Démonstration reproductible du site vitrine** | `tests/e2e/demo-site.ts` (`npm run demo:site`) | rapport `test-results/demo-site-report.md`, captures |
| Banc de fidélité **multipage** : chaque page publiée de chaque fixture (11 pages × 4 largeurs), header et footer compris | `tests/fidelity/run.ts` | 44/44 identiques |
| Corrections révélées par la démonstration (voir plus bas) | `image/definition.ts`, `presets.ts` | démonstration, banc |

## Démonstration (`npm run demo:site`)

Le script pilote l'interface du Studio comme un utilisateur, sans écrire de code ni de JSON :

1. Création du projet « Atelier Nord » depuis « Page vide », avec l'URL du site.
2. Design system : couleur « Primaire », police serif, style « Titre 1 » responsive (52 px, 36 px en mobile).
3. Médiathèque : import de 5 images avec textes alternatifs et tags.
4. Pages Présentation, Services, Réalisations et Contact, avec leurs slugs.
5. Header (logo, navigation repliable) et footer partagés, menu principal créé automatiquement.
6. Contenu des pages :
   - Accueil : hero avec image prioritaire, trois cartes liées aux Services, appel à l'action sur la couleur du design system ;
   - Présentation : titre, texte, image ;
   - Services : onglets et FAQ ;
   - Réalisations : galerie de trois images légendées ;
   - Contact : coordonnées et bouton `mailto:`.
7. Meta description de chaque page, puis enregistrement.
8. Contrôles avant export (0 erreur, 0 avertissement), puis export Astro et **build statique lancés depuis le Studio** (`npm ci` + `astro build`, hors dépôt).
9. **Arrêt du Studio**, puis le dossier statique servi par un serveur HTTP quelconque. Vérifications faites sur ce site :
   - statut 200, titre, meta description et URL canonique des 5 pages ;
   - aucune violation axe grave ;
   - aucun défilement horizontal à 1280 et 390 px ;
   - `<script>` présent uniquement sur la page Services (onglets) ;
   - navigation par le menu, avec la page courante signalée ;
   - menu replié **ouvert sans JavaScript** en mobile, et onglets lisibles sans JavaScript ;
   - `404.html`, `sitemap.xml` (5 URL), `robots.txt`, 15 variantes WebP avec `srcset`.

## Problèmes trouvés et corrigés

| Problème | Cause | Correction |
|---|---|---|
| Contraste insuffisant dans l'appel à l'action (1,03:1 sur le bouton) | Bouton « secondaire » (texte bleu) et texte bleu pâle sur un fond coloré, dans le préréglage | Bouton principal et texte blanc dans le préréglage ; détecté par axe sur le site construit |
| Défilement horizontal de la page d'accueil | Une image dans une rangée flex imposait sa largeur naturelle (`min-width: auto`) | `.ns-image{min-width:0}` ; contrôle ajouté à la démonstration |
| Bouton de l'appel à l'action aligné à gauche | `alignSelf: start` par défaut du bouton | `alignSelf: center` dans le préréglage |
| Démonstration bloquée après un échec | Serveur statique non fermé en cas d'erreur | Fermeture dans `finally` |

## Bilan du jalon 2 — Definition of Done (`02-site-builder.md` §7)

| Critère | État | Preuve |
|---|---|---|
| Création d'un site multipage sans intervention dans le code | ✅ | `npm run demo:site` : 5 pages entièrement construites dans l'interface |
| Navigation et liens fonctionnels | ✅ | Liens par référence de page (le slug suit), menus, contrôle des liens cassés ; navigation vérifiée sur le site servi |
| Compositions partagées | ✅ | Header et footer (ADR-0007), masquables par page ; banc multipage |
| Design system opérationnel | ✅ | Tokens en variables CSS, styles de texte responsives (ADR-0009) ; e2e « un token modifié se répercute sur 3 pages » |
| Médiathèque | ✅ | Images, SVG vérifiés, fichiers ; métadonnées, usages, fichiers manquants ; images optimisées (ADR-0010) |
| Prévisualisation complète | ✅ | `preview.html` : liens, menus, header/footer, médias, îlots, responsive réel, modifications non enregistrées |
| Contrôles d'export | ✅ | `checkSite` (erreurs bloquantes / avertissements), relancé par le serveur ; e2e |
| Build Astro autonome | ✅ | Lockfile figé, `npm ci` + build hors dépôt lancé par le Studio ; site servi Studio arrêté |
| Documentation de déploiement | ✅ | README de l'export (déploiement, 404), `redirects/README.md`, `MEDIA.md` |
| Tests de non-régression | ✅ | 132 tests unitaires, 33 contrôles e2e, banc 44/44, `npm run demo`, `npm run demo:site` |
| Site démonstrateur exploitable | ✅ | Site statique « Atelier Nord » servi et vérifié par `npm run demo:site` |

Démonstration demandée par §6 : accueil, présentation, services, réalisations, contact ; identité graphique commune ;
header responsive ; footer partagé ; navigation fonctionnelle ; plusieurs mises en page ; galerie ; médias optimisés ;
métadonnées SEO ; page 404 ; sources et build statique exportés ; build dans un environnement vierge (installation
depuis le lockfile, hors dépôt) ; site servi sans démarrer le Studio. **Tous couverts.**

## Vérifications finales

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 132/132 |
| `npm run test:e2e` | 33/33 |
| `npm run test:fidelity` | 44/44 identiques (8 fixtures, 11 pages × 4 largeurs), interactions conformes, aucune violation grave |
| `npm run demo` | réussie (scénario du jalon 1, toujours valide) |
| `npm run demo:site` | réussie : 0 erreur, 0 avertissement, 5/5 pages conformes |

## Limites et points ouverts pour la suite

Le détail figure dans `docs/limitations.md` ; les points principaux :

- **Environnement d'exécution** :
  - adaptateur de développement local, sans authentification ;
  - build statique lancé dans la requête, avec le réseau requis pour `npm ci` ;
  - fidélité mesurée sous Chromium uniquement.
- **Choix assumés** :
  - pixels des images exclus du banc (optimisation au build, ADR-0010) ;
  - header et footer intégrés à chaque page exportée ;
  - pas de ZIP.
- **Fonctions absentes** :
  - formulaire ;
  - vidéos locales ;
  - fichiers de police ;
  - variantes de header et footer dans l'interface ;
  - breakpoints éditables ;
  - ombres ;
  - redirection proposée au changement de slug ;
  - contrôle de contraste dans le Studio.
- **Jalon 3 non anticipé** : sections et modèles réutilisables, animations, assistance IA.
