# CloserFlow 25.0.0 — Production Ready pass

- Correction des références invalides introduites en V22–V24.
- Correction des routes vers Sales Autopilot, Client Experience et Inventory.
- Correction des statuts Mission et du champ de planification.
- Calcul pipeline V23 basé sur les lignes réelles des devis.
- Affichage des noms clients V24 aligné sur le modèle Client.
- `allowMixedContent` désactivé sur Android.
- Suppression de `android/local.properties` du package distribué.
- Error Boundary global pour éviter un écran blanc en cas de crash React.
- Audit statique automatisé `npm run audit`.
- Commande `npm run build:prod` = audit + build TypeScript/Vite.

Limite de validation : les dépendances npm ne peuvent pas être installées dans l'environnement actuel, donc le build TypeScript/Vite et l'APK Gradle ne sont pas annoncés comme validés.
