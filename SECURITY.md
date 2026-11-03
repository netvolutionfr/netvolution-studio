# Sécurité

## Signaler une faille

Ne publiez pas de ticket public. Utilisez le signalement privé de GitHub : onglet **Security** du dépôt → **Report a vulnerability**. Nous accusons réception et indiquons la suite donnée.

## Avant d'héberger le Studio

Le Studio n'a pas d'authentification : toute personne qui l'atteint a tous les droits sur les projets. Placez-le derrière un proxy qui fournit HTTPS et une authentification éprouvée, et gardez son port sur `127.0.0.1` (voir [deploy/README.md](deploy/README.md) et [docs/limitations.md](docs/limitations.md)).

Les sites exportés sont statiques et ne dépendent pas du Studio.
