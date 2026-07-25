# CloserFlow v11.3 — Facturation électronique

Cette version renforce le module de préparation à la facturation électronique :

- contrôles métier codifiés sur l'émetteur, l'acheteur, les dates, les lignes, la TVA et le paiement ;
- export UBL 2.1 enrichi avec identifiants, contacts, remises, unités, paiement et totaux ;
- export CII enrichi avec remises, unités, paiement et totaux ;
- contrôle technique local des balises indispensables et des valeurs numériques ;
- dossier de preuve JSON v2 avec résultats de conformité, validation XML et empreintes de détection d'altération ;
- paquet de transmission JSON regroupant UBL, CII et preuve ;
- journal CSV mis à jour.

## Limites

Le contrôle local ne remplace pas une validation officielle XSD/Schematron ni la transmission via une plateforme agréée. Les empreintes FNV détectent des modifications accidentelles mais ne constituent pas une signature cryptographique.
