# ADR-0002 — Stratégie de rendu fidèle aperçu ↔ Astro

**Statut :** Accepté le 29/10/2026 — confirmé par le banc de fidélité de la tranche 1 (`docs/architecture/tranche-1.md`) · **Date :** 29/10/2026 · **Réf. :** 00 §4, VE-07, VE-11, VE-12 ; étude §5 ; `prototypes/render-fidelity/`

## Contexte

La fidélité aperçu/export est le risque principal (CLAUDE §6). Un composant ne doit pas avoir deux implémentations métier ; l'export doit être compréhensible, autonome, sans runtime NS.

## Décision recommandée — S1 « vues React partagées »

1. Chaque composant a **une vue React pure** (props → JSX ; aucun état, effet, API navigateur, `dangerouslySetInnerHTML`), contrôlée par lint.
2. **Canvas** : iframe rendant ces vues avec `react-dom/client`, plus la feuille produite par `toCss(doc)`. Largeur d'iframe = largeur d'aperçu ⇒ les vraies media queries s'appliquent.
3. **Export** : projet Astro utilisant `@astrojs/react` **sans directive `client:`** ; les vues `.tsx` sont copiées verbatim ; `page.css` vient du même `toCss`. Zéro JS livré.
4. **Page exportée en JSX explicite** (props sérialisées par `JSON.stringify` dans des expressions) pour la lisibilité ; repli `<Page doc={json} />`.
5. **Banc de fidélité** obligatoire en CI : export construit vs canvas, mêmes navigateur/viewport/polices/données ; DOM normalisé (ordre d'attributs), styles calculés, boîtes, pixels.

## Preuve

Prototype (Astro 7.4.4, React 19.3.1, Chromium) à 1280/1024/768/375 px : DOM normalisé identique, 0/18 éléments à style ou boîte différents, captures identiques au pixel, 0 `<script>`, build depuis lockfile hors dépôt réussi. Écart observé : ordre des attributs de `<img>` (sans effet).

## Alternatives

| | Raison du non-choix au jalon 1 |
|---|---|
| S2 IR HTML neutre + sérialiseurs React/Astro | Export sans React, mais DSL maison et deux sérialiseurs à maintenir ; reste l'option si un export « 100 % .astro » est exigé |
| S3 Composants `.astro` rendus côté serveur pour l'aperçu (Container API) | Service de rendu, aller-retour par frappe, synchronisation DOM ; statut de l'API à vérifier |
| S4 Canvas = `astro dev` de l'export | Latence et couplage au système de fichiers ; utile seulement comme vérification |

## Conséquences

- L'export dépend de `react`, `react-dom`, `@astrojs/react` **au build** (pas au runtime).
- Les futures interactivités (jalon 2 : accordéon, onglets) devront privilégier HTML natif (`<details>`) ou des îlots ciblés ; décision ultérieure.
- Les vues sont un contrat public de l'export : leur lisibilité compte.

## Addendum (tranche 2, 29/10/2026)

Iframe `sandbox="allow-scripts allow-same-origin"` : sans `allow-same-origin`, le serveur de dev Vite refuse les modules à l'origine `null` (R3, `docs/architecture/tranche-2.md`). Le canvas n'est donc pas isolé du shell ; la protection repose sur l'absence de HTML/JS dans les documents.

## Points ouverts

- [O] Acceptabilité de `.tsx` dans un export « Astro » (sinon S2).
- [O] Forme de page JSX explicite vs JSON, à valider en tranche 1.
- [H] Stabilité de la fidélité avec polices web locales et autres navigateurs (Firefox, WebKit).

## Addendum — îlots JavaScript (jalon 2, tranche 6, 30/10/2026)

Les composants interactifs (onglets, vidéo) gardent une vue React pure, rendue en HTML statique au build. Leur
comportement vient d'un **îlot** : un module `island.ts` sans dépendance, placé à côté de la vue.

- **Interface** : l'îlot exporte une fonction `init(root)` idempotente qui enrichit le balisage existant. Il
  n'injecte jamais de HTML à partir de données, et les tests interdisent `innerHTML`, `eval` et les imports.
- **Déclaration** : la définition du composant porte `island: true`.
- **Export** : le module est copié dans `src/scripts/` et chargé par un `<script>` Astro, uniquement dans les pages
  qui utilisent le composant. Les autres pages restent sans JavaScript, et le banc le vérifie.
- **Sans JavaScript** : le balisage serveur doit rester utilisable. Les onglets s'affichent comme des panneaux
  successifs avec leur titre, et la vidéo comme un lien vers la page du fournisseur.
- **Fidélité** : le canvas exécute après chaque rendu les îlots qui façonnent l'état initial (`canvasIslands` :
  les onglets), pour garder un DOM identique à l'export. Un îlot qui n'agit qu'à l'interaction (la vidéo) ne
  touche pas le DOM avant celle-ci. Le canvas ne l'exécute pas, ce qui évite de charger un lecteur tiers dans
  l'éditeur.
- **Aperçu du site** : il exécute tous les îlots.
- **Banc** : il compare l'état initial enrichi (DOM, styles, pixels). Il vérifie aussi, sur le site construit, le
  fonctionnement au clavier avec JavaScript et la lecture sans JavaScript.
