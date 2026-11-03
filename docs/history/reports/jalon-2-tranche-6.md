# Jalon 2 — Tranche 6 : composants enrichis et îlots JavaScript

**Date :** 30/10/2026 · **Périmètre :** SB-07 (étude jalon 2 §4.6, §9), ADR-0002 (addendum îlots) · **Statut :** livré

## Livré

| Élément de SB-07 | Réalisation | Vérification |
|---|---|---|
| Logo | Préréglage : image (SVG ou raster) avec lien facultatif ; l'image accepte désormais un lien et une légende (`<figure>`) | banc, `components.test.ts` |
| Navigation | Livrée en tranche 4 | — |
| Liste de liens | Composant `links` : les entrées de premier niveau d'un menu, en colonne ou en ligne, dans un `<nav>` nommé | banc |
| Cartes, appel à l'action | Préréglages (icône, titre, texte, bouton ; fond, rayon) | e2e (bibliothèque) |
| Galerie simple | Préréglage : grille responsive d'images légendées (`<figure>`), images optimisées à l'export | banc |
| Vidéo intégrée | Composant `video` : URL YouTube ou Vimeo validée ; façade sans requête tierce avant le clic, puis lecteur `youtube-nocookie` / `player.vimeo.com?dnt=1` par l'îlot. Sans JS : lien vers la vidéo | banc (lien de repli sans JS) |
| Icônes | Composant `icon` : 20 icônes Lucide (ISC) dont les données sont dans le registre ; décorative par défaut, nom accessible facultatif ; taille et couleur par la typographie | `components.test.ts`, banc |
| Accordéon accessible | `accordion` / `accordion-item` en `<details>` / `<summary>`, sans JavaScript ; préréglage « Accordéon (FAQ) » | banc, e2e |
| Onglets accessibles | `tabs` / `tab` : motif ARIA (flèches, Origine, Fin, focus suivi) par îlot ; sans JS, panneaux successifs avec leur titre `h3` ; préréglage « Bloc d'onglets » | banc (clavier avec JS, lecture sans JS), e2e (aperçu) |

Mécanismes communs :

- **Îlots** (`island.ts`, `init(root)` idempotent). Le canvas exécute les onglets ; l'aperçu exécute tout. À
  l'export, un `<script>` n'est ajouté qu'aux pages concernées (`src/scripts/`). Voir l'addendum d'ADR-0002.
- **`resolve(props, ctx, node)`** : la vue des onglets reçoit les titres de ses panneaux.
- **Champ lien facultatif** (« Aucun lien »), utilisé par l'image.
- **Banc** : nouvelle fixture `interactive.json`, règle « JavaScript seulement pour les composants interactifs »,
  contrôles d'interaction sur le site construit, et localisation du premier écart de DOM dans le rapport.

## Choix faits pendant la tranche

- **Préréglages plutôt que composants** pour le logo, les cartes, l'appel à l'action et la galerie : ce sont des
  compositions de composants existants, donc éditables pièce par pièce.
- **Liste de liens alimentée par un menu** : les liens internes restent des références de pages, gérées à un seul
  endroit.
- **L'îlot n'écrit pas dans le DOM avant une interaction** (`WeakSet` plutôt qu'un attribut marqueur), pour que
  le DOM du canvas reste identique à l'export.
- **CSS en propriétés longues** pour les boutons d'onglets : le minificateur CSS du build Astro réécrit
  `background:none`, ce qui changeait la valeur calculée. Le banc l'a détecté.
- **Formulaire** (facultatif dans SB-07) : non livré.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 128/128 |
| `npm run test:e2e` | 32/32, dont « onglets et accordéon depuis la bibliothèque, clavier dans l'aperçu, axe sans violation » |
| `npm run test:fidelity` | 32/32 identiques (8 fixtures × 4 largeurs) ; scripts uniquement sur la page interactive (2 îlots) ; interactions conformes ; aucune violation grave |
| `npm run demo` | réussie |

## Limites

- **Vidéo** : fichiers vidéo locaux non pris en charge, seulement YouTube et Vimeo. Pas de vignette du fournisseur (aucune requête tierce avant le clic).
- **Onglets** : titres de repli sans JS fixés en `h3`. L'état sélectionné n'est pas conservé dans l'URL.
- **Édition dans le canvas** : un élément d'accordéon fermé ne s'ouvre pas, il faut cocher « Ouvert » pour éditer son contenu, ou passer par l'arborescence. Le lecteur vidéo ne se charge pas dans l'éditeur.
- **Imbrication** : rien n'empêche de placer un élément d'accordéon ou un onglet hors de son conteneur. Il s'affiche alors comme une section.
- **Icônes** : jeu limité à 20 icônes.
- **Formulaire** : pas de composant formulaire.
