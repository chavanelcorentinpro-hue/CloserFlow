# CloserFlow v11.2 — Déploiement Cloud

## Démarrage

```bash
cp .env.docker.example .env
# Modifier au minimum CLOSERFLOW_API_TOKEN et, sur un serveur public, CLOSERFLOW_DOMAIN
docker compose up -d --build
```

- En local : `http://localhost`
- Avec un domaine public pointant vers le serveur : Caddy demande automatiquement un certificat HTTPS.

## Sauvegarde et restauration

```bash
./scripts/backup-now.sh
./scripts/restore.sh backups/closerflow-data-AAAA...tar.gz
```

Le service `backup` crée aussi une archive périodique dans `./backups`.

## Mise à jour

```bash
./scripts/update.sh
```

Le script sauvegarde les données avant de reconstruire les conteneurs.
