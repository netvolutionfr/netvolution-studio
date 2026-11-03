# Jalon 3 — Tranche 8 : démonstration et bilan du jalon

**Date :** 30/10/2026 · **Périmètre :** spécification 03 §5 (démonstration), §6 (Definition of Done), CS-12 · **Statut :** livré, validé le 30/10/2026

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| **Démonstration reproductible du jalon 3** | `tests/e2e/demo-creative.ts` (`npm run demo:creative`) | rapport `test-results/demo-creative-report.md`, captures |
| **Mesure des performances** du site exporté : HTML, CSS, JS (en ligne compris), poids total et requêtes de chaque page, chargement à froid ; bornes du site de démonstration | `demo-creative.ts` | rapport |
| **Recherche de secrets dans l'export** : sources et build analysés alors qu'une clé factice est configurée sur le serveur | `demo-creative.ts`, `api.test.ts` | démonstration, tests |
| Variante « plus sobre » du fournisseur simulé | `dev-server/ai/simulated.ts` | démonstration |

## Démonstration (`npm run demo:creative`)

Le script pilote l'interface du Studio comme un utilisateur, à partir du site du jalon 2 (modèle « Atelier Nord »). Il suit les 12 étapes de la spécification §5 :

1. Section **Hero** insérée depuis la bibliothèque, sur la page Présentation.
2. Paramètres et couleurs : titre, niveau H2, fond `#eef2ff`.
3. Composition enregistrée comme **composant réutilisable** « Hero atelier ».
4. Composant **réutilisé, lié**, sur la page Services.
5. **Animation d'entrée** « à l'apparition » sur le hero.
6. **Comportement mobile** : le hero passe en colonne à 390 px dans le canvas.
7. **L'IA propose une variante plus sobre** (fournisseur simulé, déterministe).
8. **Examen** du diff : marges verticales de 80 à 48 px, fond retiré. Rien n'est appliqué avant l'acceptation.
9. **Acceptation**.
10. **Annulation puis rétablissement**, chacun en une seule étape ; le journal indique l'origine « IA », sans contenu.
11. Contrôles, **export Astro et build statique** depuis le Studio.
12. **Studio arrêté**, puis le site statique est servi et vérifié :
    - hero animé masqué avant le défilement, puis révélé ;
    - en mouvement réduit et sans JavaScript, le hero est visible et rien ne s'anime ;
    - aucun défilement horizontal à 1280 et 390 px ;
    - aucune violation axe grave et aucune erreur JavaScript ;
    - poids de chaque page dans les bornes ;
    - **aucun secret** ni variable de configuration IA dans les fichiers exportés.

Mesures du 30/10/2026, au chargement à froid :

| Page | HTML | CSS | JS | Total | Requêtes |
|---|---|---|---|---|---|
| Accueil | 6,1 Ko | 4,4 Ko | 0 | 20,5 Ko | 3 |
| Présentation (hero animé) | 8,3 Ko | 3,3 Ko | 1,6 Ko | 22,5 Ko | 2 |
| Services (onglets) | 8,6 Ko | 3,7 Ko | 0,9 Ko | 8,6 Ko | 1 |
| Réalisations (galerie) | 7,1 Ko | 3,1 Ko | 0 | 47,6 Ko | 4 |
| Contact | 5,3 Ko | 2,6 Ko | 0 | 5,3 Ko | 1 |

Le CSS et le JS en ligne sont aussi comptés dans le HTML. Les bornes (HTML 40 Ko, CSS 30 Ko, JS 15 Ko, total 1,5 Mo, 20 requêtes) sont fixées sur ce site, avec une marge, pour **détecter une régression** (dépendance ou script ajouté à toutes les pages). Ce ne sont pas des garanties pour d'autres sites (CLAUDE §9).

## Bilan du jalon 3 — Definition of Done (`03-creative-studio.md` §6)

| Critère | État | Preuve |
|---|---|---|
| Bibliothèques de sections et templates fonctionnelles | ✅ | 16 sections intégrées, avec vignettes rendues, et sections du projet (tranche 1) ; modèle de site « Atelier Nord », enregistrer comme modèle, créer depuis un modèle (tranche 2) ; e2e |
| Composants réutilisables et versionnés | ✅ | Instances liées, paramètres, versions, propagation avec revue, détacher (ADR-0011) ; e2e, démonstration étapes 3-4 |
| Composition avancée sans rupture du responsive | ✅ | Position, superposition, transformations, poignées, guides, alignement (tranche 4) ; banc, absence de défilement horizontal vérifiée |
| Animations déclaratives fonctionnelles | ✅ | CSS + Web Animations API, sans dépendance (ADR-0012) ; banc (entrée au défilement), démonstration étape 5 et site servi |
| Respect du reduced motion | ✅ | Aucune animation et contenu visible en mouvement réduit et sans JavaScript ; banc, démonstration, simulation dans le canvas |
| Assistance IA opérationnelle sur des commandes structurées | ✅ | Catalogue de commandes, lots atomiques (ADR-0013) ; fournisseurs Anthropic, compatible OpenAI, simulé (ADR-0014) ; assistant (tranche 7) |
| Validation humaine des modifications IA | ✅ | Revue du diff, Accepter ou Rejeter (sans trace), une annulation, journal « IA » ; e2e, démonstration étapes 7-10 |
| Export Astro autonome | ✅ | Build statique hors dépôt, site servi Studio arrêté ; `demo:site`, `demo:creative` |
| Absence de secret dans les exports | ✅ | Clé côté serveur uniquement ; analyse de l'export (`api.test.ts`, `demo:creative`) et du code du Studio (`ai.test.ts`) |
| Tests et documentation | ✅ | 170 tests unitaires, 38 contrôles e2e, banc, ADR-0011 à 0014, comptes rendus des tranches 1 à 8 |
| Démonstration complète reproductible | ✅ | `npm run demo:creative` : fournisseur simulé, sans réseau pour l'IA (le build statique demande `npm ci`) |

## Vérifications finales

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 170/170 |
| `npm run test:e2e` | 38/38 |
| `npm run test:fidelity` | aucun écart (10 fixtures, 13 pages × 4 largeurs), animations conformes |
| `npm run demo`, `npm run demo:site` | réussies (scénarios des jalons 1 et 2, toujours valides) |
| `npm run demo:creative` | réussie |

## Limites et points ouverts pour la suite

Le détail figure dans `docs/limitations.md`. Points principaux :

- **IA** :
  - qualité des propositions non évaluée avec un modèle réel ;
  - un seul tour, sans conversation ;
  - pas d'aperçu dans le canvas avant acceptation ;
  - quotas en mémoire, sans comptes.
- **Composants réutilisables** : paramètres adressés par chemin, liste fixée à la création, sections propres au projet.
- **Composition** : manipulations directes à la souris uniquement (l'inspecteur couvre le clavier) ; pas de sélection multiple.
- **Animations** : pas de chronologie ni d'éditeur de courbe ; un seul jeu de transitions de survol/focus par élément.
- **Environnement** : serveur de développement local, sans authentification ; fidélité mesurée sous Chromium uniquement.
