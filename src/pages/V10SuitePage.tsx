import { BrainCircuit, CheckCircle2, CloudCog, FileCheck2, Globe2, PlugZap, Rocket, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
const modules=[
 {title:'Chiffrage assisté',status:'Opérationnel',detail:'Pré-devis, fournitures, marge et contrôles',to:'/trade-estimator',icon:BrainCircuit},
 {title:'Planning intelligent',status:'Nouveau v10',detail:'Répartition des missions et charge équipe',to:'/smart-planning',icon:Sparkles},
 {title:'Application terrain',status:'Opérationnel',detail:'Pointage, photos, signature et hors-ligne',to:'/terrain',icon:Smartphone},
 {title:'Facturation électronique',status:'Préparation avancée',detail:'UBL, CII, conformité et suivi',to:'/electronic-invoicing',icon:FileCheck2},
 {title:'Portail client',status:'Opérationnel',detail:'Validation, documents et messagerie',to:'/portal',icon:Globe2},
 {title:'Cloud multi-utilisateur',status:'Connectable',detail:'Comptes, rôles, historique et synchronisation',to:'/cloud',icon:CloudCog},
 {title:'Sécurité et audit',status:'Opérationnel',detail:'Authentification, rôles et traçabilité',to:'/automations',icon:ShieldCheck},
 {title:'Connecteurs externes',status:'Architecture prête',detail:'API serveur et futures intégrations partenaires',to:'/accounts',icon:PlugZap},
];
export function V10SuitePage(){return <><div className="section-heading v10-heading"><div><p className="eyebrow">CLOSERFLOW 10</p><h1>Suite artisan tout-en-un</h1><p className="muted-copy">Une vue consolidée des briques nécessaires pour exploiter et commercialiser CloserFlow.</p></div><Rocket/></div><div className="v10-summary panel"><div><strong>8</strong><span>piliers produit</span></div><div><strong>1</strong><span>application unifiée</span></div><div><strong>Local + cloud</strong><span>architecture hybride</span></div></div><div className="v10-module-grid">{modules.map(({title,status,detail,to,icon:Icon})=><Link to={to} className="panel v10-module" key={title}><Icon/><div><span className="v10-status"><CheckCircle2/>{status}</span><h2>{title}</h2><p>{detail}</p></div></Link>)}</div><section className="panel v10-note"><h2>Limites clairement identifiées</h2><p>Les connexions bancaires automatiques, la transmission officielle via une plateforme agréée et la publication native sur les stores nécessitent encore des comptes, contrats ou services externes. Le projet fournit les modules métier et les points d’intégration, sans prétendre remplacer ces partenaires réglementés.</p></section></>}
