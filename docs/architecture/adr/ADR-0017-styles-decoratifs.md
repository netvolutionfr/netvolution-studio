# ADR-0017 — Styles décoratifs : bordures, ombres, dégradés, images de fond

**Statut :** Accepté le 31/10/2026 (bordures et ombres), complété le 31/10/2026 (dégradés et images de fond) · **Date :** 31/10/2026 · **Réf. :** CLAUDE §5 et §8, ADR-0002, ADR-0009

## Contexte

Les graphistes qui ont testé le Studio (guide d'utilisation, chapitre 4) n'avaient ni bordures, ni ombres, ni dégradés, ni images de fond. Ce sont des réglages de base dans Tatsu et Elementor. Il faut les ajouter sans remettre en cause deux invariants :
- **aucun CSS brut** dans les documents : les styles sont une liste fermée de propriétés à valeurs structurées (CLAUDE §5 et §8) ;
- la **fidélité** entre l'aperçu et l'export (ADR-0002), mesurée par le banc.

## Décision

### 1. Bordures et ombres (livré)

Quatre propriétés facultatives s'ajoutent à `styleDeclsSchema`, dans le groupe `background`. Tous les composants qui ont déjà une couleur de fond y ont donc accès : conteneur, pile, grille, bouton, image, séparateur.

| Propriété | Valeur | CSS |
|---|---|---|
| `borderWidth` | longueur positive ou token de taille | `border-width` |
| `borderStyle` | `solid`, `dashed`, `dotted`, `double`, `none` | `border-style` |
| `borderColor` | couleur `#rgb[a]` ou `#rrggbb[aa]`, ou token de couleur | `border-color` |
| `shadow` | `none`, ou `{ x, y, blur, spread, color, inset? }` | `box-shadow` |

- **Une seule ombre par élément.** Elle est décrite par des longueurs et une couleur hexadécimale, avec la transparence dans le canal alpha. La couleur d'ombre n'accepte pas de token : la transparence d'une ombre est propre à l'ombre, et le passage par une variable CSS n'apporterait rien.
- **`none` est une valeur explicite** : elle sert à retirer, sur un breakpoint, une ombre héritée d'une taille plus large.
- **Les quatre côtés sont réglés ensemble.** Une bordure sur un seul côté reste à faire : elle demandera ses propres propriétés, pas un format de valeur différent.
- **Une épaisseur seule ne dessine rien en CSS.** L'inspecteur règle donc aussi le style `solid` quand aucun style ne s'applique encore. Le modèle, lui, reste une simple liste de propriétés indépendantes.
- **Les documents existants restent valides tels quels.** Les propriétés sont facultatives : aucune migration, pas de changement de `schemaVersion`.

### 2. Dégradés et images de fond (livré)

Deux propriétés de plus, dans le même groupe :

| Propriété | Valeur |
|---|---|
| `gradient` | `none`, ou `{ kind: linear \| radial, angle, stops }` : 2 à 4 couleurs hexadécimales (avec alpha), chacune à une position de 0 à 100 % |
| `backgroundImage` | `none`, ou `{ asset, size: cover \| contain \| auto, position }` : un **média image ou SVG du site**, jamais une URL libre |

- **Une seule déclaration `background-image`.** Le dégradé et l'image forment une seule déclaration, le dégradé par-dessus (un voile sur une photo). Chaque breakpoint l'émet à partir des **valeurs effectives** (`resolveStyle`). Un breakpoint qui ne change que le dégradé garde donc l'image héritée, et inversement. On n'a pas utilisé de variables CSS, parce qu'elles s'héritent d'un parent à ses enfants.
- **Les couleurs de dégradé n'acceptent pas de token**, comme les ombres : un dégradé joue sur la transparence, qui ne relève pas de la charte.
- **Les références d'image sont contrôlées comme celles des composants.** Une image inconnue rend le site invalide. Une image utilisée en fond ne peut pas être retirée de la médiathèque. L'export copie l'image dans `public/media/`, sans conversion (décision du 31/10/2026). Le contrôle avant export avertit au-delà de **500 Ko**, à partir de la taille des fichiers (`GET /api/projects/:id/media?sizes`).
- **Le canvas et l'export** utilisent le même préfixe de médias que les images et les polices, donc les mêmes chemins.

## Alternatives écartées

- **Un champ « CSS personnalisé »** : il contredit CLAUDE §8, casse la garantie de fidélité et ouvre l'injection.
- **Plusieurs ombres par élément** : rarement utile pour un site vitrine, et une interface plus lourde. Si le besoin apparaît, le modèle pourra accepter une liste d'ombres.
- **Des tokens d'ombre** : les trois préréglages de l'inspecteur (douce, moyenne, forte) couvrent l'usage courant. Des tokens n'auront de sens que s'ils deviennent nécessaires à la charte d'un client.

## Conséquences

- Le banc de fidélité couvre bordures et ombres (fixture `elements` : bouton à bordure en tirets ; image avec bordure, ombre, et ombre retirée sur mobile), ainsi que les fonds (fixture `composition` : image et voile en dégradé, dégradé radial sur mobile qui garde l'image). Il compare les URL d'image par leur chemin, pas par leur origine.
- Le guide (chapitre 4) documente ces réglages, avec le contraste du texte sur une image.
- Supprimer un token de couleur utilisé par une bordure est refusé, comme pour le texte et le fond.
