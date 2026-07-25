# CloserFlow v16.0.0

ERP/CRM pour artisans, utilisable sur téléphone et ordinateur.

## Termux

```bash
npm install
npm run server
npm run dev -- --host 127.0.0.1 --port 5175
```

## Déploiement Docker / Cloud

```bash
cp .env.docker.example .env
# Remplacer le jeton et renseigner le domaine
docker compose up -d --build
```

Documentation cloud : `docs/DEPLOIEMENT_CLOUD_V11_2.md`.

Facturation électronique : `docs/FACTURATION_ELECTRONIQUE_V11_3.md`.
