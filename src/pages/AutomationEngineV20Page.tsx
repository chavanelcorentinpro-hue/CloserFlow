import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bot, CheckCircle2, Clock3, Play, RefreshCw, Settings2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { totals } from '../lib/documents';

type Rule={id:string;name:string;enabled:boolean;trigger:string;action:string;route:string};
type Run={id:string;ruleId:string;title:string;detail:string;createdAt:string;status:'ready'|'done'};
const RULES_KEY='closerflow.v20.rules'; const RUNS_KEY='closerflow.v20.runs';
const defaults:Rule[]=[
 {id:'overdue',name:'Relance impayés',enabled:true,trigger:'Facture échue avec solde restant',action:'Créer une action de relance prioritaire',route:'/follow-ups'},
 {id:'quote',name:'Relance devis',enabled:true,trigger:'Devis envoyé ou brouillon',action:'Ajouter au pipeline de relance',route:'/sales-autopilot-v18'},
 {id:'invoice',name:'Facturation fin de chantier',enabled:true,trigger:'Mission terminée sans facture',action:'Créer une action de facturation',route:'/invoices'},
 {id:'stock',name:'Alerte stock',enabled:true,trigger:'Quantité sous le seuil minimum',action:'Préparer le réassort',route:'/inventory'},
 {id:'appointment',name:'Rendez-vous client',enabled:true,trigger:'Demande de rendez-vous en attente',action:'Créer une action de traitement',route:'/client-experience-v17'},
 {id:'message',name:'Réponse client',enabled:true,trigger:'Message client non lu',action:'Créer une action de réponse',route:'/client-experience-v17'},
];
function loadRules(){try{return JSON.parse(localStorage.getItem(RULES_KEY)||'null')||defaults}catch{return defaults}}
function loadRuns(){try{return JSON.parse(localStorage.getItem(RUNS_KEY)||'[]') as Run[]}catch{return []}}
function uid(){return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`}
export function AutomationEngineV20Page(){
 const {quotes,invoices,missions,inventory,appointmentRequests,portalMessages}=useAppData(); const [rules,setRules]=useState<Rule[]>(loadRules); const [runs,setRuns]=useState<Run[]>(loadRuns);
 const signals=useMemo(()=>{const inv=invoices.map(i=>{const total=totals(i.lines,i.discount_percent,i.vat_rate).ttc;const paid=(i.payments??[]).reduce((s,p)=>s+p.amount,0);return {...i,remaining:Math.max(0,total-paid)}});return {
  overdue:inv.filter(i=>i.remaining>.01&&(i.status==='overdue'||(i.due_date&&new Date(i.due_date).getTime()<Date.now()))).length,
  quote:quotes.filter(q=>q.status==='sent'||q.status==='draft').length,
  invoice:missions.filter(m=>m.status==='completed'&&!invoices.some(i=>i.mission_id===m.id)).length,
  stock:inventory.filter(i=>i.quantity<=i.minimum_quantity).length,
  appointment:appointmentRequests.filter(a=>a.status==='pending').length,
  message:portalMessages.filter(m=>m.author==='client'&&!m.read).length,
 }},[quotes,invoices,missions,inventory,appointmentRequests,portalMessages]);
 const saveRules=(x:Rule[])=>{setRules(x);localStorage.setItem(RULES_KEY,JSON.stringify(x))}; const saveRuns=(x:Run[])=>{setRuns(x);localStorage.setItem(RUNS_KEY,JSON.stringify(x))};
 function execute(){const created:Run[]=[];for(const r of rules.filter(r=>r.enabled)){const count=signals[r.id as keyof typeof signals]||0;if(count>0)created.push({id:uid(),ruleId:r.id,title:r.name,detail:`${count} élément(s) détecté(s) · ${r.action}`,createdAt:new Date().toISOString(),status:'ready'})}saveRuns([...created,...runs].slice(0,100))}
 const pending=runs.filter(r=>r.status==='ready'); const active=rules.filter(r=>r.enabled).length; const detected=Object.values(signals).reduce((a,b)=>a+b,0);
 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 20 · AUTOMATION ENGINE</p><h1>Automatisation métier</h1><p>Des règles configurables qui transforment automatiquement les événements CloserFlow en actions à exécuter.</p></div><button className="primary" onClick={execute}><Play/>Exécuter les règles</button></div>
 <section className="v20-kpis"><article><Zap/><span>Règles actives</span><strong>{active}/{rules.length}</strong></article><article><Activity/><span>Signaux détectés</span><strong>{detected}</strong></article><article><Clock3/><span>Actions en attente</span><strong>{pending.length}</strong></article><article><ShieldCheck/><span>Historique</span><strong>{runs.length}</strong></article></section>
 <section className="v20-grid"><div className="panel"><div className="section-heading"><div><p className="eyebrow">RÈGLES</p><h2>Centre de contrôle</h2></div><Settings2/></div><div className="v20-rules">{rules.map(r=><article key={r.id}><button className={`v20-toggle ${r.enabled?'on':''}`} onClick={()=>saveRules(rules.map(x=>x.id===r.id?{...x,enabled:!x.enabled}:x))}>{r.enabled?'ON':'OFF'}</button><div><strong>{r.name}</strong><small><b>SI</b> {r.trigger}</small><small><b>ALORS</b> {r.action}</small></div><span>{signals[r.id as keyof typeof signals]||0}</span></article>)}</div><button className="ghost" onClick={()=>saveRules(defaults)}><RefreshCw/>Réinitialiser les règles</button></div>
 <div className="panel"><div className="section-heading"><div><p className="eyebrow">EXÉCUTION</p><h2>File automatique</h2></div><Bot/></div><div className="v20-runs">{pending.map(run=>{const rule=rules.find(r=>r.id===run.ruleId);return <article key={run.id}><div><strong>{run.title}</strong><small>{run.detail}</small></div>{rule&&<Link className="ghost compact" to={rule.route}><ArrowRight/>Ouvrir</Link>}<button className="primary compact" onClick={()=>saveRuns(runs.map(x=>x.id===run.id?{...x,status:'done'}:x))}><CheckCircle2/>Fait</button></article>})}{!pending.length&&<div className="empty-state"><Sparkles/><strong>Aucune action en attente</strong><p>Exécute les règles pour analyser les données actuelles.</p></div>}</div></div></section>
 <section className="panel"><div className="section-heading"><div><p className="eyebrow">JOURNAL</p><h2>Dernières exécutions</h2></div></div><div className="v20-log">{runs.slice(0,12).map(r=><article key={r.id}><span className={r.status}>{r.status==='done'?'Terminé':'À faire'}</span><div><strong>{r.title}</strong><small>{new Date(r.createdAt).toLocaleString('fr-FR')} · {r.detail}</small></div></article>)}</div></section></>;
}
