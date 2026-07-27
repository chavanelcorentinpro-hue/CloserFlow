# CloserFlow 51.0.0 — Supplier Reconciliation & Auto Stock

- Facture fournisseur analysée ligne par ligne depuis le texte OCR.
- Formats de lignes fournisseur détectés localement.
- Rapprochement automatique fournisseur / bon de commande.
- Rapprochement par référence SKU puis désignation.
- Score de confiance par ligne.
- Alerte si quantité facturée supérieure au reliquat commandé.
- Alerte si prix fournisseur varie de plus de 10 %.
- Validation humaine avant réception.
- Réception liée à un BC utilise le moteur V4 existant :
  - mise à jour stock ;
  - création d'article si absent ;
  - bon de réception ;
  - statut partiel/reçu.
- Réception libre met également le stock à jour.
- Historique réel des prix fournisseurs mémorisé.
- Page Prix fournisseurs avec coût moyen et évolution.
- Dépense fournisseur créée après validation.
- V50 et tous les modules précédents conservés.
