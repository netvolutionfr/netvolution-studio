# ADR-0016 — Mode de distribution : application web hébergée, instance privée

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** CLAUDE §3, §8 et §12, ADR-0014, ADR-0015

## Contexte

Il faut choisir comment l'équipe utilise le Studio au quotidien. Trois possibilités :
- une application de bureau (Electron, ou Tauri) ;
- une application hébergée pour l'équipe ;
- un SaaS ouvert à des clients ou à des tiers.

Besoins exprimés le 30/10/2026 :
- **seulement l'équipe Netvolution** ;
- **deux utilisateurs** ;
- **pas de besoin hors ligne**.

## Décision

**Application web hébergée, en une seule instance privée** : `studio.netvolution.fr`, conteneur Docker derrière nginx (HTTPS, mot de passe), déployé par GitHub Actions (ADR-0015). Pas d'application de bureau, pas de SaaS multi-clients.

Évolutions prévues, chacune soumise à une nouvelle décision :
1. **Une instance par client**, si des clients doivent modifier leur site : la même image Docker, avec un domaine, un dossier de données et des mots de passe propres à chacun. Cela demande peu de code et isole fortement les clients.
2. **SaaS multi-clients**, seulement si le volume le justifie : comptes, organisations, rôles, quotas, base de données, audit. C'est un jalon à part entière, aujourd'hui hors périmètre (CLAUDE §2).

## Alternatives

- **Electron ou Tauri** : écarté.
  - L'export exécute `npm ci` et `astro build`, ce qui obligerait à embarquer Node et npm sur chaque poste.
  - Les clés d'IA doivent rester côté serveur (CS-11).
  - Il faudrait signer et notariser l'application, la livrer pour trois systèmes et gérer ses mises à jour.
  - Le seul bénéfice, le travail hors ligne, n'est pas demandé. L'option reste possible plus tard, en emballant la même application et la même API.
- **SaaS multi-clients dès maintenant** : écarté. L'authentification, les rôles et l'isolation des données sont disproportionnés pour deux utilisateurs.

## Conséquences

- Pas de comptes ni de rôles dans le Studio. Les deux utilisateurs ont chacun un mot de passe nginx (bcrypt) et tous les droits.
- Une mise à jour est livrée à chaque tag de version (`v*`), après approbation : une seule version en service. (Depuis l'ouverture du dépôt sous Apache-2.0, le 03/11/2026 ; auparavant à chaque push sur `main`.)
- Disponibilité et sauvegardes : celles du serveur web4.
- À revoir si des clients ou d'autres utilisateurs doivent accéder au Studio, ou si un besoin hors ligne apparaît.
