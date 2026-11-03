---
title: "9. Animations"
---

Le Studio propose des animations **déclaratives** : vous décrivez l’effet (un fondu, un glissement, un zoom) et son déclencheur, le Studio produit le code, léger et accessible. C’est l’équivalent des « animations d’entrée » et effets de survol d’Elementor ou de Tatsu.

## Ajouter une animation

1. Sélectionnez l’élément.
2. En bas de l’inspecteur, section **Animations**, cliquez sur **Ajouter une animation**. Par défaut : une apparition au défilement, en fondu depuis 24 px plus bas, en 600 ms.
3. Réglez le déclencheur et l’effet ; **Rejouer** montre le résultat dans le canvas.

![Une animation d’entrée « à l’apparition », avec ses réglages](images/animations.png)

Un élément peut avoir plusieurs animations (une entrée et un survol, par exemple). La corbeille en supprime une.

## Les déclencheurs

| Déclencheur | Quand | L’effet décrit |
|---|---|---|
| **Au chargement** | À l’ouverture de la page | L’état **de départ** : l’élément part de là pour arriver à son apparence normale |
| **À l’apparition (défilement)** | Quand l’élément entre dans l’écran | L’état de départ |
| **Au clic** | À chaque clic sur l’élément | L’état de départ (l’animation se rejoue) |
| **Au survol** | Pendant le passage de la souris | L’état **visé** : l’élément y va, puis revient |
| **Au focus clavier** | Quand l’élément reçoit le focus au clavier | L’état visé |

Pensez aux visiteurs qui naviguent au clavier : un effet de survol sur un bouton ou une carte cliquable gagne à être doublé d’un effet **au focus clavier**.

## Les réglages

| Réglage | Rôle |
|---|---|
| **Opacité** | 0 (invisible) à 1 (opaque). « Opacité de départ » 0 donne un fondu |
| **Décalage X**, **Décalage Y** (px) | Un glissement horizontal ou vertical ; Y positif : depuis le bas |
| **Échelle** | 0,9 : l’élément grandit en apparaissant ; 1,05 au survol : un léger zoom |
| **Rotation** (°) | Une rotation, à manier avec parcimonie |
| **Durée**, **Délai** (ms) | 300 à 800 ms conviennent à la plupart des entrées ; 150 à 250 ms aux survols |
| **Accélération** | Linéaire, douce, accélérée, décélérée (la plus naturelle pour une entrée), accélérée puis décélérée |
| **Répétitions**, **Sens** | Pour un effet qui se répète (aller-retour). La répétition sans fin n’existe qu’au chargement |
| **Cascade des enfants** (ms) | Anime les enfants **l’un après l’autre** au lieu de l’élément entier : idéal pour une grille de cartes qui apparaissent en vague |

## Voir les animations dans le canvas

Pour ne pas vous gêner pendant l’édition, le canvas ne joue pas les animations par défaut. Deux cases en tête de la section :

- **Jouer les animations dans le canvas** : les entrées se jouent comme sur le site ;
- **Simuler « mouvement réduit »** : le canvas se comporte comme chez un visiteur qui a demandé moins d’animations (voir ci-dessous).

L’**Aperçu du site** (nouvel onglet) joue toujours les animations, comme le site publié.

## Accessibilité et robustesse

Le Studio applique trois règles, sans réglage de votre part :

- **Mouvement réduit.** Les visiteurs qui ont activé « réduire les animations » dans leur système (sensibilité au mouvement, troubles vestibulaires) voient le contenu **immobile et visible**, sans aucune animation.
- **Sans JavaScript**, le contenu reste visible : une animation ne peut pas cacher un texte.
- **Pas de JavaScript inutile.** Les survols et focus sont en CSS pur ; seules les pages qui ont une entrée animée chargent un petit script, sans bibliothèque externe.

## Bonnes pratiques

- **Peu, et toujours la même chose.** Une même entrée discrète pour les sections du site donne une impression de qualité ; dix effets différents, de l’agitation.
- **Rien d’important n’attend une animation.** Un titre principal qui apparaît après une seconde retarde la lecture : réservez les entrées au contenu plus bas dans la page.
- **Évitez les grands déplacements** et les rotations sur de grandes surfaces : ce sont eux qui gênent les personnes sensibles au mouvement.
- Vérifiez sur **mobile**, où l’écran est petit et où tout « apparaît » plus vite.
