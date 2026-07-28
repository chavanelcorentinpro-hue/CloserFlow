## 57.0.0
- Hardening : scan secrets, headers sécurité, rate limit, CORS, entitlements serveur et licence propriétaire.

## 56.0.0
- Public Web Launch : frontend déployable, PWA, variables API/site, workflow web et packaging serveur.

## 55.0.0
- Self-Service Trial : inscription publique, workspace automatique, essai 14 jours, plan serveur et onboarding.

## 54.0.0
- Commercial Launch : landing page, tarifs, essai 14 jours, abonnement et suivi conversion.

## 53.0.0
- Real Project Margin : coût matière + heures + déplacement + sous-traitance + bénéfice réel chantier.

## 52.0.0
- Invoice Stock Out : facture client → sortie stock + coût matière réel + marge brute.

## 51.0.0
- Supplier Reconciliation : facture fournisseur → rapprochement BC → réception → stock + historique des coûts.

## 50.0.0
- Smart Purchase Orders : bons de commande, validation, suivi fournisseur et réception.

## 49.0.0
- Smart Procurement : besoins, pénuries, urgences, fournisseurs et budget achat.

## 48.0.0
- Auto Planning : affectation équipe, charge, conflits, indisponibilités et recalcul des retards.

## 47.0.0
- AI Project Manager : planning chantier, tâches, heures estimées, avancement et alertes stock/temps.

## 47.0.0
- AI Pricing Engine : prix réalistes, marge et coûts réels.

## 35.0.0
- Team Workspace & Approvals : équipe multi-utilisateurs, demandes sensibles, validation manager/admin et journal auditable.

## 34.0.0
- Cloud Sync & Multi-Device : appareils, révisions, conflits, restauration sécurisée et contrôle du workspace.

## 33.0.0
- Data Health & Beta Polish : intégrité des relations métier, doublons, préparation B2B/facturation, versions UI corrigées et garde-fous de compilation.

## 32.0.0
- Beta Channel Hardening : smoke tests, métadonnées et paquet bêta Android standardisé.

## 31.0.0
- Beta Release Packaging : manifest, checksum, checklist QA et artefact GitHub bêta.

## 30.0.0
- APK Beta Gate : tentative de build complète et validation conditionnée à la production réelle d'un APK.

## 29.0.0
- Real Build Gate : environnement, CI complète et diagnostics renforcés jusqu'à l'APK.

## 28.0.0
- Dependency & CI Hardening : lock check, dependency integrity, npm ci propre et diagnostics renforcés.

## 27.0.0
- Build Reproducibility : doctor, diagnostics CI, contrôle Android, workflow renforcé et synchronisation lock/version.

## 26.0.0
- Build & Release Hardening : synchronisation automatique des versions Android, workflow GitHub dynamique, contrôles release et correction du versioning V16 historique.

## 25.0.0
- Production Ready pass : corrections de cohérence V22–V24, durcissement Android, Error Boundary et audit statique automatisé.

## 24.0.0
- Rentability Control : marge par chantier, dérives de coûts, rentabilité client et alertes de marge.

## 23.0.0
- Capacity Planner : plan de charge 8 semaines, capacité équipe, marge prévisionnelle et alertes de surcharge/sous-charge.

## 22.0.0
- Daily Command : objectifs, score opérationnel, alertes et file d'actions priorisée.

## 21.0.0\n- Cash Pilot : projection de trésorerie 90 jours et scénarios.\n\n# 17.0.0
- Expérience client 360°, rendez-vous portail, activité client et cockpit relation client.
- Conservation des modules V16 cloud/sécurité et de la chaîne Android.

# CloserFlow v16.0.0 — Cloud, comptes & sécurité

- Nouveau centre Plateforme v16 : appareils, permissions, sauvegardes et audit local.
- Matrice de permissions par rôle (admin, manager, employé).
- Registre d’appareils avec confiance et révocation.
- Centre d’alertes métier persistant.
- Points de restauration v16 conservés localement.
- Audit de sécurité et qualité des données en un clic.
- Endpoints serveur pour résumé de plateforme et gestion des appareils.
- Health/OpenAPI alignés sur 16.0.0.
- Android versionCode 16000 / versionName 16.0.0.
- Pipeline GitHub Actions aligné sur l’artefact v16.

# CloserFlow v15.0.0 — Operating System

- Nouveau centre de pilotage unifié v15 : Aujourd’hui, Argent, Chantiers, Équipe, Clients et Risques.
- Recherche transversale instantanée sur clients, chantiers, devis et factures.
- Score de santé entreprise calculé localement à partir des impayés, affectations, stock, qualité des données, marge et facturation.
- Priorités automatiques avec accès direct aux écrans d’exécution.
- Liste Focus personnelle persistante pour les actions du jour.
- Objectifs configurables : CA, encaissement, impayés maximum, marge et capacité équipe.
- Vue trésorerie et créances, portefeuille chantier, disponibilité équipe, qualité clients et matrice des risques.
- Raccourcis mobiles vers création chantier, devis, pointage et scanner de stock.
- Version Android 15.0.0 / versionCode 15000 et pipeline APK GitHub aligné.

## 14.1.0
- Finance Autopilot : file priorisée de créances, facturation des devis acceptés, encaissement rapide, objectifs financiers, aging des créances et projection nette à 30 jours.
- Nouvelle route /finance-autopilot et intégration au menu Plus.
- Versions Android et GitHub Actions alignées sur 14.1.0.

# CloserFlow v13.9.0 — Automation Hub

- Nouveau pilote automatique local : détection des impayés, devis acceptés, chantiers terminés, stock critique, entretiens et fiches clients incomplètes.
- File d’actions priorisée avec exécution, réouverture, ignore et historique local.
- Règles activables avec actions configurables et paramètres métier.
- Relances portail client, conversion devis → facture, génération de visites et tâches chantier.
- Tableau de qualité des données et score de santé opérationnelle.
- Export CSV de la file d’automatisation.
- Nouvelle route `/automation-hub` et accès depuis Plus.

# v13.7.0 — Supply Chain & Margin Engine

- Plan de réassort calculé sur stock, réservations, seuils et commandes ouvertes.
- Création multi-lignes de bons de commande depuis les besoins de réassort.
- Réservations de stock par chantier et libération en un clic.
- Besoins d’achat chantier générés depuis les matériaux déclarés.
- Score fournisseurs : fill rate, retards, volume, préférence et délai cible.
- Protection de marge chantier : CA, main-d’œuvre, dépenses et matériaux valorisés.
- Export CSV des besoins et réassorts.
- Nouvelle route /supply-chain et accès depuis Plus.
- Correctifs TypeScript v13.6 (SquareStop / Command) intégrés à la base.

# 13.6.0 — Business OS / Cockpit 360

- Cockpit unique : agenda, trésorerie, dispatch, qualité et actions.
- Audit automatique clients, chantiers, devis, factures et équipe.
- Prévision de trésorerie 30 / 60 / 90 jours.
- Affectation automatique des chantiers sans responsable.
- Facturation groupée des devis acceptés et détection des retards.
- Génération des visites de maintenance et contrôle des stocks faibles.
- Plan d’action dirigeant persistant, objectifs hebdomadaires et export CSV.
- Score de santé opérationnelle 0–100.

# CloserFlow v13.6.0

- Nouvelle Control Tower dirigeant.
- Prévision de trésorerie à 6 mois avec scénarios stress, base et optimiste.
- Contrôle économique des chantiers : CA, main-d’œuvre, dépenses, marge et risque.
- Prévision de capacité équipe sur 6 semaines avec détection de surcharge.
- Score client intégrant encours, retards, conversion et activité.
- Plan d’action automatique persistant et export CSV consolidé.
- Seuils dirigeant configurables : trésorerie, marge, capacité et taux de gain devis.

# 13.5.0 — Revenue Ops

- Nouveau centre Revenue Ops : objectifs, encaissements, pipeline commercial et protection de marge.
- Tableau de bord mensuel : CA facturé, encaissements, créances, conversion devis et marge.
- Analyse d’âge des créances avec priorité des impayés les plus anciens.
- Encaissement rapide du solde d’une facture et génération de tâches de relance locales.
- Conversion directe des devis acceptés en facture à 30 jours.
- Pipeline de devis ouverts, acceptés non facturés et taux de conversion.
- Analyse de rentabilité par chantier à partir des factures, pointages et dépenses.
- Objectifs mensuels persistants et score Revenue Ops sur 100.
- Plan d’action automatique selon les risques de trésorerie, marge et conversion.
- Top clients par chiffre d’affaires et encours.
- Export CSV consolidé des impayés, devis à facturer et marges chantier.
- Nouvelle route /revenue-ops et accès depuis Plus.

# 13.4.0 — Centre d’exécution

- Centre d’exécution unifié Finance / Chantiers / Équipe / Contrôle.
- Détection des impayés, devis acceptés non facturés et chantiers terminés non facturés.
- Conversion rapide devis → facture avec échéance à 30 jours.
- Affectation automatique des missions sans responsable.
- Vue planning du jour, tâches ouvertes et démarrage rapide des chantiers.
- Détection des chevauchements de planning par collaborateur.
- Synthèse des heures et du coût de main-d’œuvre.
- Arrêt rapide des pointages actifs.
- Score de qualité opérationnelle et checklist dirigeant persistante.

# CloserFlow 13.2.0

- Sauvegarde automatique quotidienne sur l’appareil.
- Rotation de cinq points de restauration locaux.
- Point de sécurité créé avant restauration ou réinitialisation.
- Diagnostic d’intégrité des données locales.
- Vérification des fichiers importés avant remplacement.
- Version de sauvegarde alignée sur l’application Android.

# 13.0.0
- Centre de validation consolidé des jalons 1 et 2.
- Gestion locale des absences et indisponibilités équipe.
- Détection des conflits de planning et actions prioritaires.
- KPI devis, facturation, encaissement et marge opérationnelle.

# 12.3.0

- Ajout du cockpit hebdomadaire « Ma semaine ».
- Objectifs personnalisables de facturation, encaissements et heures.
- Calcul des résultats de la semaine à partir des factures, paiements et pointages.
- Plan d’action priorisé : impayés, devis à relancer, missions à planifier ou affecter, stock faible et chronomètres actifs.
- Actions traitables, réinitialisation hebdomadaire et export CSV.

# Changelog

## 12.2.0
- Nouveau module de prévision de charge équipe sur 4 à 12 semaines.
- Capacités hebdomadaires personnalisables par collaborateur.
- Détection des semaines surchargées, missions non affectées et non planifiées.
- Export CSV de la charge prévisionnelle.
- Vue mobile avec accès rapide aux missions à corriger.


## 11.5.0
- Nouveau centre de sauvegarde et restauration locale.
- Export JSON portable de toutes les données CloserFlow.
- Validation du fichier avant restauration.
- Remplacement sécurisé des données locales et rechargement automatique.
- Indicateurs de volume et nombre d’éléments sauvegardés.
- Aucune donnée envoyée vers un service externe.


## 11.4.0
- Assistant Vision chantier local
- Import de photos et contrôle de luminosité
- Observations guidées et suggestions de lignes de devis
- Création d’un brouillon de devis
- Aucun envoi d’image vers un service externe

10.5.0

- Nouveau tableau de bord Business Intelligence.
- Indicateurs de chiffre d’affaires, marge, charges et conversion.
- Analyse par client et par chantier.
- Export CSV du pilotage.
- Chargement différé des pages pour réduire le bundle initial.

# 10.4.0

- Nouveau centre SAV et maintenance.
- Génération des visites depuis les contrats arrivant à échéance.
- Suivi des interventions, techniciens, durées, notes et pièces prévues.
- Registre des équipements et garanties avec alertes d’expiration.
- Données incluses dans les sauvegardes locales.

# CloserFlow 10.3.0

- Nouveau centre Comptabilité & trésorerie.
- Import de relevés CSV, OFX/QFX et CAMT.053 XML.
- Balance clients et fournisseurs.
- Estimation de TVA collectée, déductible et nette.
- Export comptable CSV avec journaux ventes et achats.
- Export des opérations bancaires importées.

# 10.0.0

- Ajout du planning intelligent avec équilibrage de charge, estimation de durée et priorisation des urgences.
- Ajout du centre CloserFlow 10 regroupant les piliers produit et leurs limites d’intégration.
- Mise à jour de la navigation et de la version API.

## 9.4.0
- Nouveau CRM commercial avec pipeline Kanban.
- Opportunités, montants, probabilités et prévision pondérée.
- Relances et prochaines actions avec échéances.
- Historique des appels, e-mails et notes par client.
- Statistiques de conversion et export CSV.

## 9.3.0
- Gestion enrichie des salariés, techniciens, responsables et sous-traitants.
- Coût horaire, téléphone et compétences par membre.
- Modification, désactivation et suppression sécurisée.
- Indicateurs d’heures, coûts, missions et chronomètres actifs.
- Export CSV de l’équipe et de l’activité.

## 9.2.0
- Assistant IA métier enrichi : multi-postes, fournitures, informations manquantes, hypothèses et lignes éditables.
- Création directe d’un brouillon de devis.

# v9.0.0

- Gestion documentaire locale par chantier.
- Import multiple de photos, PDF et documents.
- Catégories, tags, notes, garanties et recherche.
- Galerie de chantier et téléchargement des fichiers.
- Rapport documentaire imprimable.

# 8.4.0

- Capture mobile des factures fournisseurs.
- Prévisualisation de photo et boîte de réception locale.
- Extraction heuristique fournisseur, numéro, date, HT, TVA et TTC depuis le texte.
- Création d’une dépense fournisseur en un clic.

# CloserFlow 6.2.0

## Nouvelles fonctions
- Centre de dépenses professionnelles : catégories, fournisseurs, TVA récupérable, dépenses payées ou à payer, rattachement à un chantier.
- Contrats d’entretien récurrents : fréquence mensuelle, trimestrielle ou annuelle, échéances, activation/suspension et calcul du CA annuel récurrent.
- Facturation électronique enrichie : cycle de statuts, plateforme et identifiant de dépôt, journal CSV, export XML UBL et contrôles de conformité.
- Sauvegardes v6 enrichies avec dépenses, contrats et suivi de facturation électronique.
- Navigation mobile et écrans Plus mis à jour.

## Compatibilité
- Android / Termux
- PWA
- Build TypeScript + Vite

## 10.1.0
- Ajout d’un centre API et connecteurs dans l’interface.
- Création et révocation de clés API à droits limités.
- Endpoints publics en lecture pour le workspace, les clients et les missions.
- Documentation OpenAPI 3.0 disponible sur `/api/openapi.json`.
- Gestion de webhooks configurables et journal d’audit des intégrations.
- Hachage SHA-256 des clés secrètes stockées côté serveur.

## 11.1.0
- Ajout du centre Déploiement SaaS.
- Statut d'utilisation par espace : utilisateurs, sessions, stockage et révision cloud.
- Journal d'audit serveur par entreprise.
- Export de sauvegarde JSON réservé aux administrateurs et responsables.
- Isolation explicite des données par workspace et indicateurs de sécurité.
- API de santé mise à jour en version 11.1.0.

## 12.4.0 — Bibliothèque d’ouvrages avancée
- Ajout du temps de pose par ouvrage.
- Calcul de la marge en euros et en pourcentage.
- Favoris, filtres par catégorie et recherche enrichie.
- Duplication rapide d’un ouvrage.
- Import et export CSV compatibles mobile.
- Migration automatique de l’ancien catalogue local v7.

## 13.3.0 — Centre mobile de contrôle
- Nouveau centre mobile avec planning du jour, priorités automatiques et tâches locales.
- Vue encaissements : reste à encaisser, impayés, pipeline devis et solde brut mensuel.
- Contrôle de santé des données avec score local et anomalies opérationnelles.
- Détection des chantiers sans responsable, non planifiés, clients sans contact, devis à relancer, stock faible et pointages actifs.
- Export CSV consolidé du contrôle mobile.


## 13.8.0 — Field Operations
- Nouveau cockpit terrain unifiant dispatch, tickets SAV, SLA et contrôle qualité.
- Auto-affectation des interventions et tickets selon la charge active de l’équipe.
- Tickets avec priorité, échéance SLA, responsable, statut et conversion en action corrective.
- Contrôles qualité structurés : sécurité, finitions, propreté et documentation.
- Création automatique d’actions correctives lorsqu’un contrôle est insuffisant ou comporte des non-conformités.
- Tableau de charge équipe, chronomètres actifs et signaux importants du journal chantier.
- Score opérationnel global et indicateurs SLA / qualité / actions critiques.
- Export CSV consolidé des tickets et actions terrain.


## 14.0.0 — Business Intelligence & AI Core
- Nouveau cockpit Direction intelligente avec score de santé opérationnelle.
- Prévision de trésorerie sur 3, 6 ou 12 mois à partir des créances, planning, pipeline, contrats et dépenses.
- Copilote décisionnel local : impayés, marge, facturation, capacité, planning, conversion, stock et qualité des données.
- Analyse de marge par chantier et classement des risques.
- Prévision de capacité équipe sur six semaines.
- Analyse valeur / risque client et encours.
- Objectifs dirigeant persistants : trésorerie plancher, marge, capacité, conversion et encaissement.
- Export CSV consolidé des indicateurs, recommandations et prévisions.
- Nouvelle route /executive-intelligence et accès depuis Plus.
- Android versionCode 14000 / versionName 14.0.0.

## 18.0.0
- Sales Autopilot : scoring automatique des prospects et clients.
- Priorités commerciales chaud / tiède / froid.
- Pipeline détecté depuis devis, missions et interactions portail.
- Recommandations d'actions et génération de relances.
- File d'exécution persistante avec actions appel, e-mail, message et tâche.
- Étapes commerciales modifiables et persistées localement.
- Message rapide connecté à la messagerie client V17.

## 19.0.0
- Ajout Company Autopilot : score de santé, priorités, encaissement, ventes, exploitation et risques.

## 20.0.0
- Automation Engine : règles métier, détection de signaux, file d’exécution et journal de contrôle.
