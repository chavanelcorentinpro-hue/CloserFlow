import { PiggyBank, Zap } from 'lucide-react';
import { Activity, BarChart3, BellRing, Bot, Boxes, Building2, CalendarDays, Cloud, Gauge, Moon, MessageSquareText, MessagesSquare, FileText, ReceiptText, RotateCcw, Search, Settings, ShoppingCart, UserRoundCheck, Users, KeyRound, TrendingUp, FileCheck2, WalletCards, CalendarClock, BookOpen, Landmark, ClipboardCheck, NotebookPen, Clock3, ScanLine, ListChecks, Rocket, BrainCircuit, Calculator, Camera, BadgeEuro, FolderArchive, Smartphone, KanbanSquare, Sparkles, Layers3, PlugZap, Scale, Wrench, ChartNoAxesCombined, MapPinned, ShieldCheck, ScanSearch, ArchiveRestore, ShieldAlert, CalendarRange, CalendarCheck2, Flag, HeartPulse, GaugeCircle, HandCoins, Radar, Command, Flame} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
export function MorePage(){const {resetDemo}=useAppData();return <><div className="page-title"><div><p className="eyebrow">OUTILS</p><h1>Plus</h1></div></div><div className="more-grid">
 <Link className="menu-card v24-menu" to="/profitability-v24"><Scale/><div><strong>CloserFlow 24 · Rentability Control</strong><small>Marge chantier, dérives de coûts et rentabilité client</small></div></Link>
 <Link className="menu-card v23-menu" to="/capacity-planner-v23"><CalendarRange/><div><strong>CloserFlow 23 · Capacity Planner</strong><small>Charge équipe, marge prévisionnelle et semaines à risque</small></div></Link>
 <Link className="menu-card v22-menu" to="/daily-command-v22"><Flame/><div><strong>CloserFlow 22 · Daily Command</strong><small>Priorités du jour, objectifs, alertes et actions recommandées</small></div></Link>
 <Link className="menu-card v21-menu" to="/cash-pilot-v21"><PiggyBank/><div><strong>CloserFlow 21 · Cash Pilot</strong><small>Trésorerie prédictive 90 jours, scénarios et priorités cash</small></div></Link>\n <Link className="menu-card v20-menu" to="/automation-engine-v20"><Zap/><div><strong>CloserFlow 20 · Automation Engine</strong><small>Règles métier, exécution automatique et journal de contrôle</small></div></Link>
 <Link className="menu-card v19-menu" to="/company-autopilot-v19"><Gauge/><div><strong>CloserFlow 19 · Company Autopilot</strong><small>Plan d’action automatique : cash, ventes, chantiers et risques</small></div></Link>
 <Link className="menu-card v18-menu" to="/sales-autopilot-v18"><BrainCircuit/><div><strong>CloserFlow 18 · Sales Autopilot</strong><small>Score prospects, pipeline intelligent et relances prioritaires</small></div></Link>
 <Link className="menu-card v17-menu" to="/client-experience-v17"><UserRoundCheck/><div><strong>CloserFlow 17 · Expérience client</strong><small>Relation 360°, rendez-vous, messages, signatures et paiements</small></div></Link>
 <Link className="menu-card v16-menu" to="/platform-v16"><ShieldCheck/><div><strong>CloserFlow 16 · Cloud & sécurité</strong><small>Comptes, appareils, permissions, sauvegardes et contrôle de sécurité</small></div></Link>
 <Link className="menu-card v15-os-menu" to="/v15-os"><Sparkles/><div><strong>CloserFlow 15 · Operating System</strong><small>Pilotage global, priorités, recherche et risques en temps réel</small></div></Link>
 <Link className="menu-card finance-autopilot-menu" to="/finance-autopilot"><Landmark/><div><strong>Finance Autopilot v14.1</strong><small>Facturation, encaissements, créances et projection 30 jours</small></div></Link>
 <Link className="menu-card v14-menu" to="/executive-intelligence"><BrainCircuit/><div><strong>Direction intelligente v14</strong><small>Prévisions, risques, opportunités et copilote décisionnel</small></div></Link>
 <Link className="menu-card automation-hub-menu" to="/automation-hub"><PlugZap/><div><strong>Automation Hub v13.9</strong><small>Relances, facturation, qualité des données et actions automatiques</small></div></Link>
 <Link className="menu-card field-ops-menu" to="/field-ops"><ClipboardCheck/><div><strong>Field Operations v13.8</strong><small>Dispatch, tickets SAV, SLA, qualité et actions correctives</small></div></Link>
 <Link className="menu-card supply-chain-menu" to="/supply-chain"><ShoppingCart/><div><strong>Supply Chain & Marge v13.7</strong><small>Réassort, réservations chantier, fournisseurs et protection de marge</small></div></Link>
 <Link className="menu-card business-os-menu" to="/business-os"><Command/><div><strong>Cockpit 360 v13.6</strong><small>Décisions, trésorerie, dispatch, qualité et actions automatiques</small></div></Link>
 <Link className="menu-card tower-menu" to="/control-tower"><Radar/><div><strong>Control Tower v13.6</strong><small>Prévision, marge, capacité, risque client et plan d’action</small></div></Link>
 <Link className="menu-card revenue-menu" to="/revenue-ops"><HandCoins/><div><strong>Revenue Ops v13.5</strong><small>Encaissements, pipeline commercial, objectifs et protection de marge</small></div></Link>
 <Link className="menu-card execution-menu" to="/execution-suite"><GaugeCircle/><div><strong>Centre d’exécution v13.4</strong><small>Finance, chantiers, équipe et contrôle opérationnel</small></div></Link>
 <Link className="menu-card mobile-control-menu" to="/mobile-control"><HeartPulse/><div><strong>Centre mobile v13.3</strong><small>Aujourd’hui, encaissements et contrôle des données</small></div></Link>
 <Link className="menu-card milestone-menu" to="/milestones"><Flag/><div><strong>Jalons 1 & 2 terminés</strong><small>Validation, pilotage et absences équipe</small></div></Link>
 <Link className="menu-card weekly-menu" to="/weekly-pilot"><CalendarCheck2/><div><strong>Ma semaine v12.3</strong><small>Objectifs, exécution et plan d’action priorisé</small></div></Link>
 <Link className="menu-card workload-menu" to="/workload-forecast"><CalendarRange/><div><strong>Prévision de charge v12.2</strong><small>Capacité, surcharge et missions à affecter</small></div></Link>
 <Link className="menu-card operations-menu" to="/operations-control"><ShieldAlert/><div><strong>Contrôle opérationnel v12.1</strong><small>Priorités, conflits, encaissements et stock</small></div></Link>
 <Link className="menu-card" to="/backup-center"><ArchiveRestore/><div><strong>Sauvegarde & restauration v11.5</strong><small>Export local, contrôle et restauration complète</small></div></Link>
 <Link className="menu-card vision-menu" to="/vision-estimator"><ScanSearch/><div><strong>Assistant Vision v11.4</strong><small>Photos, observations et pré-devis local</small></div></Link>
 <Link className="menu-card cloud-menu" to="/saas-deployment"><Cloud/><div><strong>Déploiement SaaS v11.1</strong><small>Supervision, isolation, audit et sauvegardes</small></div></Link>
 <Link className="menu-card v10-menu" to="/platform-v11"><ShieldCheck/><div><strong>CloserFlow 11 Enterprise</strong><small>Multi-entreprises, IA locale, connecteurs et marketplace</small></div></Link>
 <Link className="menu-card route-menu" to="/route-optimization"><MapPinned/><div><strong>Optimisation des tournées v10.6</strong><small>Ordre des interventions, kilomètres et coûts</small></div></Link>
 <Link className="menu-card bi-menu" to="/business-intelligence"><ChartNoAxesCombined/><div><strong>Pilotage dirigeant v10.5</strong><small>CA, marges, clients et rentabilité chantier</small></div></Link>
 <Link className="menu-card bank-menu" to="/accounting-treasury"><Scale/><div><strong>Comptabilité & trésorerie v10.3</strong><small>Balances, TVA, relevés et export comptable</small></div></Link>
 <Link className="menu-card" to="/sav-maintenance"><Wrench/><div><strong>SAV & maintenance v10.4</strong><small>Visites, garanties, pièces et échéances</small></div></Link>
 <Link className="menu-card integration-menu" to="/api-connectors"><PlugZap/><div><strong>API & connecteurs v10.1</strong><small>Clés, webhooks, OpenAPI et journal</small></div></Link>
 <Link className="menu-card v10-menu" to="/v10-suite"><Layers3/><div><strong>CloserFlow 10</strong><small>Suite consolidée et état des modules</small></div></Link>
 <Link className="menu-card smart-menu" to="/smart-planning"><Sparkles/><div><strong>Planning intelligent v10</strong><small>Répartition automatique des missions</small></div></Link>
 <Link className="menu-card crm-menu" to="/commercial-crm"><KanbanSquare/><div><strong>CRM commercial v9.4</strong><small>Pipeline, relances, historique et conversion</small></div></Link>
 <Link className="menu-card terrain-menu" to="/terrain"><Smartphone/><div><strong>Application terrain v9.1</strong><small>Pointage, photos, signature et bon d’intervention</small></div></Link>
 <Link className="menu-card document-menu" to="/documents"><FolderArchive/><div><strong>Gestion documentaire v9</strong><small>Photos, plans, garanties et rapports</small></div></Link>
 <Link className="menu-card bank-menu" to="/bank-reconciliation"><BadgeEuro/><div><strong>Rapprochement bancaire v8.5</strong><small>Import CSV et association automatique</small></div></Link>
 <Link className="menu-card" to="/supplier-invoice-capture"><Camera/><div><strong>Capture factures fournisseurs v8.4</strong><small>Photo, extraction et création de dépense</small></div></Link>
 <Link className="menu-card estimator-menu" to="/trade-estimator"><Calculator/><div><strong>Assistant IA métier v9.2</strong><small>Pré-devis, fournitures, marge et questions</small></div></Link>
 <Link className="menu-card ai-menu" to="/business-insights"><BrainCircuit/><div><strong>Analyse intelligente v8.1</strong><small>Diagnostic, risques et plan d’action</small></div></Link>
 <Link className="menu-card v8-menu" to="/pro-suite"><Rocket/><div><strong>Pilotage Pro v8</strong><small>CRM, trésorerie, conformité et tâches</small></div></Link>
 <Link className="menu-card" to="/checklist-templates"><ListChecks/><div><strong>Modèles de check-list</strong><small>Procédures réutilisables par chantier</small></div></Link>
 <Link className="menu-card" to="/time-tracking"><Clock3/><div><strong>Pointage équipe</strong><small>Chronomètres, heures et coût de main-d’œuvre</small></div></Link>
 <Link className="menu-card" to="/stock-scanner"><ScanLine/><div><strong>Scanner le stock</strong><small>QR, codes-barres et mouvements rapides</small></div></Link>
 <Link className="menu-card catalog-menu" to="/catalog"><BookOpen/><div><strong>Bibliothèque d’ouvrages v12.4</strong><small>Temps de pose, favoris, duplication et CSV</small></div></Link>
 <Link className="menu-card" to="/cashflow"><Landmark/><div><strong>Trésorerie prévisionnelle</strong><small>Encaissements, décaissements et échéancier</small></div></Link>
 <Link className="menu-card" to="/site-journal"><NotebookPen/><div><strong>Journal de chantier</strong><small>Avancement, incidents et échanges clients</small></div></Link>
 <Link className="menu-card" to="/reservations"><ClipboardCheck/><div><strong>Réserves chantier</strong><small>Suivi des anomalies et levées</small></div></Link>
 <Link className="menu-card" to="/electronic-invoicing"><FileCheck2/><div><strong>Facturation électronique v8.3</strong><small>UBL, CII, conformité et dossier de preuve</small></div></Link>
 <Link className="menu-card" to="/expenses"><WalletCards/><div><strong>Dépenses</strong><small>Achats, TVA récupérable et règlements</small></div></Link>
 <Link className="menu-card" to="/contracts"><CalendarClock/><div><strong>Contrats d’entretien</strong><small>Échéances et chiffre d’affaires récurrent</small></div></Link>
 <Link className="menu-card profitability-menu" to="/profitability"><TrendingUp/><div><strong>Rentabilité chantier</strong><small>Temps, coûts et marge réelle</small></div></Link>
 <Link className="menu-card command-menu" to="/command-center"><Gauge/><div><strong>Centre de commande</strong><small>Priorités, trésorerie et santé de l’entreprise</small></div></Link>
 <Link className="menu-card activity-menu" to="/activity-feed"><MessagesSquare/><div><strong>Fil d’équipe</strong><small>Messages et informations partagés</small></div></Link>
 <Link className="menu-card account-menu" to="/accounts"><KeyRound/><div><strong>Comptes utilisateurs</strong><small>Session serveur, rôles et membres</small></div></Link>
 <Link className="menu-card cloud-menu" to="/cloud"><Cloud/><div><strong>Synchronisation cloud</strong><small>Serveur, appareil et sauvegarde distante</small></div></Link>
 <Link className="menu-card followup-menu" to="/follow-ups"><MessageSquareText/><div><strong>Centre de relance</strong><small>Messages prêts pour devis et impayés</small></div></Link>
 <Link className="menu-card closing-menu" to="/end-of-day"><Moon/><div><strong>Fin de journée</strong><small>Contrôles, bilan et actions avant de fermer</small></div></Link>
 <Link className="menu-card v4-menu" to="/organizations"><Building2/><div><strong>Multi-entreprises</strong><small>Changer ou créer un espace société</small></div></Link>
 <Link className="menu-card v4-menu" to="/procurement"><ShoppingCart/><div><strong>Achats & logistique</strong><small>Fournisseurs, dépôts et commandes</small></div></Link>
 <Link className="menu-card v4-menu" to="/portal"><UserRoundCheck/><div><strong>Portail client v10.2</strong><small>Suivi, documents, signature et paiements</small></div></Link>
 <Link className="menu-card v4-menu" to="/automations"><Activity/><div><strong>Automatisations & audit</strong><small>Règles et traçabilité des actions</small></div></Link>
 <Link className="menu-card ai-menu" to="/assistant"><Bot/><div><strong>Assistant intelligent</strong><small>Devis, rapports et automatisations</small></div></Link>
 <Link className="menu-card" to="/search"><Search/><div><strong>Recherche globale</strong><small>Tout retrouver rapidement</small></div></Link>
 <Link className="menu-card" to="/alerts"><BellRing/><div><strong>Alertes</strong><small>Missions, impayés et relances</small></div></Link>
 <Link className="menu-card" to="/reports"><BarChart3/><div><strong>Activité</strong><small>Chiffres et exports CSV</small></div></Link>
 <Link className="menu-card" to="/inventory"><Boxes/><div><strong>Stock</strong><small>Articles, seuils et mouvements</small></div></Link>
 <Link className="menu-card team-menu" to="/team"><Users/><div><strong>Gestion des équipes v9.3</strong><small>Rôles, compétences, coûts et export des heures</small></div></Link>
 <Link className="menu-card" to="/planning"><CalendarDays/><div><strong>Planning</strong><small>Voir les missions par jour</small></div></Link>
 <Link className="menu-card" to="/quotes"><FileText/><div><strong>Devis</strong><small>Préparer et facturer</small></div></Link>
 <Link className="menu-card" to="/invoices"><ReceiptText/><div><strong>Factures</strong><small>Suivre les paiements</small></div></Link>
 <Link className="menu-card" to="/settings"><Settings/><div><strong>Paramètres</strong><small>Entreprise et sauvegardes</small></div></Link>
 <button className="menu-card" onClick={()=>{if(confirm('Réinitialiser les données de démonstration ?'))resetDemo();}}><RotateCcw/><div><strong>Réinitialiser la démo</strong><small>Efface les ajouts locaux</small></div></button>
 </div></>;}
