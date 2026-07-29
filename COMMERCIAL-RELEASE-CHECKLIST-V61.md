# CloserFlow V61 — checklist avant premières ventes

## Déjà intégré au code
- Protections V57/V58/V59 conservées.
- Licence et entitlements contrôlables côté serveur.
- Workspace lié à la session serveur.
- Fonctions premium pouvant être exécutées côté serveur.
- V60 : édition des devis et traçabilité/correction des factures.
- Page de contrôle commercial V61.
- Aucun secret de paiement ajouté au frontend.

## Obligatoire avant d'encaisser réellement
- Déployer `server/` sur un backend HTTPS persistant.
- Utiliser une base de données de production avec sauvegardes.
- Vérifier l'isolation réelle des données entre deux workspaces.
- Configurer le prestataire de paiement côté serveur et ses webhooks.
- Configurer domaine, emails transactionnels et récupération de compte.
- Renseigner identité de l'éditeur, CGV/CGU, confidentialité et mentions légales.
- Tester inscription -> essai/paiement -> abonnement -> résiliation -> perte des droits.
- Tester devis, facture, correction/avoir, exports et sauvegardes sur comptes de test distincts.

Ne pas considérer la seule publication du dossier `dist/` comme un lancement SaaS complet.
