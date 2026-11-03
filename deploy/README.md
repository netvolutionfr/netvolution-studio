# Déploiement de Netvolution Studio (Docker, nginx, GitHub Actions)

Décisions et risques : [ADR-0015](../docs/architecture/adr/ADR-0015-hebergement-docker.md) (hébergement), [ADR-0016](../docs/architecture/adr/ADR-0016-mode-de-distribution.md) (instance privée pour l'équipe).

```text
Navigateur ──HTTPS + mot de passe──▶ nginx ──127.0.0.1:3010──▶ conteneur netvolution-studio ──▶ volume ./data
GitHub (push sur main) ─▶ vérifications ─▶ image ghcr.io/<propriétaire>/<dépôt>:<commit> ─▶ SSH ─▶ docker compose up
```

## 1. Une seule fois, sur le serveur

Le Studio tourne sous un compte dédié, membre du groupe `docker`, qui est aussi l'utilisateur SSH du déploiement.

| Élément | Emplacement (exemple) |
|---|---|
| Dossier de déploiement (`DEPLOY_PATH`) | `/srv/studio` (`compose.yaml` copié par le workflow) |
| Données (projets, médias, exports) | `<DEPLOY_PATH>/data`, propriété de l'uid 1000 (« node » du conteneur) |
| Secrets du Studio (assistant IA, voir `.env.example`) | `<DEPLOY_PATH>/.env`, mode 600, jamais versionné |
| Port interne | `127.0.0.1:3010` (`NS_PORT` dans le `.env` pour en changer) |
| Vhost nginx | proxy HTTPS vers `127.0.0.1:3010`, avec `auth_basic` (ou un portail d'authentification) |
| Certificat | Let's Encrypt (certbot) |
| Mots de passe (un utilisateur par personne) | fichier `htpasswd` lu par le vhost |

Ajouter un utilisateur (bcrypt, mot de passe saisi au clavier, pas de rechargement de nginx nécessaire) :

```sh
printf "prenom:%s\n" "$(mkpasswd -m bcrypt)" >> /chemin/vers/htpasswd
```

Bannir les essais de mot de passe répétés (401) avec un outil comme CrowdSec ou fail2ban.

Le port publié doit rester sur `127.0.0.1` : Docker publie ses ports par DNAT, ce qu'un pare-feu nftables ou iptables filtrant la chaîne `input` ne voit pas.

## 2. Une seule fois, dans GitHub (Settings → Secrets and variables → Actions)

| Nom | Type | Valeur |
|---|---|---|
| `SSH_HOST` | secret | nom du serveur |
| `SSH_USER` | secret | compte de déploiement (membre du groupe `docker`) |
| `SSH_PRIVATE_KEY` | secret | clé privée dédiée au déploiement (clé publique dans `~/.ssh/authorized_keys` du serveur) |
| `SSH_FINGERPRINT` | secret | empreinte de la clé d'hôte **ECDSA** du serveur, vérifiée à chaque connexion : `ssh <serveur> ssh-keygen -lf /etc/ssh/ssh_host_ecdsa_key.pub \| cut -d' ' -f2` (forme `SHA256:…`). Pas la clé ED25519 : le client SSH (Go) des actions appleboy négocie ECDSA en priorité, et l'empreinte ED25519 échoue en « host key fingerprint mismatch » |
| `GHCR_TOKEN` | secret | jeton GitHub avec la seule permission `read:packages` (si l'image est privée) |
| `DEPLOY_PATH` | variable | dossier de déploiement sur le serveur ; sans cette variable, le job de déploiement est ignoré |

Créer aussi l'environnement **`production`** (Settings → Environments). On peut y exiger une approbation avant chaque déploiement.

Recommandé dans Settings :
- **Code security** : activer *Dependabot alerts* et *Dependabot security updates* ;
- **Branches** : protéger `main` en exigeant les vérifications `check (26)` et `check (24)` avant fusion.

## Sécurité de la chaîne et versions de Node

- **Node 26 LTS** (active depuis le 28/10/2026) dans l'image, avec la version et l'empreinte (`sha256`) figées dans le `Dockerfile`.
- **Correctifs Alpine** : appliqués à chaque build (`apk upgrade`).
- **CI sur Node 26 et 24** (LTS de maintenance, postes de développement), toujours au dernier correctif (`check-latest`).
- **Audit des dépendances d'exécution** : `npm audit --omit=dev --audit-level=high` bloque le pipeline en cas de faille haute ou critique.
- **Dependabot** (`.github/dependabot.yml`) propose chaque semaine des mises à jour, testées par la CI avant fusion :
  - les actions GitHub ;
  - l'image Node ;
  - les dépendances npm.
- **Actions GitHub épinglées par commit**, avec la version en commentaire : un tag déplacé ne peut pas injecter de code.
- **Droits minimaux** : `contents: read` par défaut, `packages: write` seulement pour publier l'image, jeton Git non conservé après le checkout.
- **Image** : publiée avec sa provenance et sa nomenclature logicielle (SBOM).
- **Déploiement** :
  - clé d'hôte SSH vérifiée ;
  - jeton GHCR en lecture seule, déconnecté après usage ;
  - déploiements sérialisés.
- **Fin de vie** : Node 24 sort du support en avril 2028 et Node 26 en avril 2029. On passe à la LTS suivante quand Dependabot la propose, après le passage de la CI.

## 3. À chaque push sur `main`

1. **check** : `npm ci`, typecheck, lint, tests unitaires (aussi sur chaque pull request).
2. **build-and-push** : image Docker poussée sur GHCR, étiquetée `latest` et avec le hash du commit.
3. **deploy** : `compose.yaml` copié sur le serveur, puis `docker compose pull && up -d` avec l'image **de ce commit**. Le job échoue si le conteneur n'est pas sain en une minute.

Déploiement manuel : onglet Actions → « Vérifier, construire et déployer » → *Run workflow*.

## Exploitation

- **Revenir à une version** : `cd "$DEPLOY_PATH" && IMAGE_TAG=<hash du commit> docker compose up -d`.
- **Journaux** : `docker logs -f netvolution-studio`. Appels IA sans contenu dans `data/ai-log.jsonl`.
- **Sauvegardes** : le dossier `data/` (projets, médias, modèles, exports, corbeille), à inclure dans les sauvegardes du serveur. Les exports sont régénérables et peuvent en être exclus (`data/exports/`).
- **Récupérer un export** : liens « Télécharger (.tar.gz) » dans la boîte d'export du Studio.
- **Mise à jour des dépendances de l'image** : reconstruite à chaque push ; l'image de base Node est figée dans le `Dockerfile`.

## Limites

- Pas de comptes dans le Studio : la protection est **uniquement** celle de nginx, et toute personne connectée a tous les droits. Un portail avec double authentification (Authelia, Cloudflare Access…) est conseillé au-delà de quelques utilisateurs de confiance.
- Un seul utilisateur à la fois par projet : un enregistrement concurrent est refusé (conflit), pas fusionné.
- L'export avec build statique a besoin d'accéder au registre npm depuis le conteneur et dure jusqu'à quelques minutes.
