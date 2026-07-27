# Déploiement V56 — architecture zéro budget

## Frontend
Le workflow `.github/workflows/deploy-web.yml` produit le site web depuis `dist`.

Configurer dans GitHub :
- Variable `CLOSERFLOW_PUBLIC_SITE_URL`
- Secret `CLOSERFLOW_API_URL`

## API
Le dossier serveur peut être lancé séparément avec :
`node server/index.mjs`

`Dockerfile` fournit une image de déploiement pour un hébergeur Docker compatible.

## Important
Le frontend statique seul ne suffit pas pour les comptes cloud, l'essai serveur et la synchronisation.
L'API doit avoir une URL HTTPS publique et persistante.

## Paiements
Toujours désactivés (`paymentsEnabled:false`) en V56.
