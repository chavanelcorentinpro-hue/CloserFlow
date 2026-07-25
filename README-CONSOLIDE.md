# CloserFlow v6.0.0 — édition consolidée

Cette archive est autonome et cumulative : elle rassemble dans un seul projet la base CloserFlow et les fonctionnalités ajoutées jusqu'à la branche 5.1.x.

## Modules inclus

- Tableau de bord, clients, missions et planning
- Devis et factures multi-lignes
- Rapports d'intervention, signatures et exports
- Recherche globale et indicateurs
- Stock et inventaire
- Assistant local
- Authentification serveur et sessions
- Gestion d'équipe, rôles et invitations
- Synchronisation cloud locale
- Détection des conflits et historique de révisions
- Fil d'équipe partagé
- Compatibilité Android / Termux

## Installation Termux

```bash
pkg update -y
pkg install nodejs unzip -y
unzip CloserFlow-v6.0.0.zip
cd CloserFlow-v6.0.0
npm install
npm run server
```

Dans un second terminal :

```bash
cd ~/CloserFlow-v6.0.0
npm run dev -- --host 127.0.0.1 --port 5175
```

Ouvrir ensuite `http://127.0.0.1:5175`.

## Important

Il n'est pas nécessaire d'installer les anciennes versions une par une. Cette édition contient directement le dernier état cumulatif du projet.
