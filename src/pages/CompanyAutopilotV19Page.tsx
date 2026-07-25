import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Banknote, BrainCircuit, CheckCircle2, Clock3, FileText, Gauge, HandCoins, Play, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp, WalletCards, Wrench } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { totals } from '../lib/documents';

type AutomationItem={id:string;title:string;detail:string;kind:'cash'|'sales'|'ops'|'quality';priority:number;route:string;done:boolean;createdAt:string};
const KEY='closerflow.v19.company.autopilot';
function read():AutomationItem[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]') as AutomationItem[]}catch{return []}}
function save(rows:AutomationItem[]){localStorage.setItem(KEY,JSON.stringify(rows))}
function euro(n:number){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)}
function uid(){return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}

export function CompanyAutopilotV19Page(){
 const {quotes,invoices,missions,businessExpenses,inventory,timeEntries,appointmentRequests,portalMessages}=useAppData();
 const [queue,setQueue]=useState<AutomationItem[]>(read);
 const model=useMemo(()=>{
  const invoiceRows=invoices.map(i=>{const t=totals(i.lines,i.discount_percent,i.vat_rate).ttc;const paid=(i.payments??[]).reduce((s,p)=>s+p.amount,0);return {...i,total:t,paid,remaining:Math.max(0,t-paid)}});
  const unpaid=invoiceRows.filter(i=>i.remaining>0.01);const overdue=unpaid.filter(i=>i.status==='overdue'||(i.due_date&&new Date(i.due_date).getTime()<Date.now()));
  const receivables=unpaid.reduce((s,i)=>s+i.remaining,0);const overdueValue=overdue.reduce((s,i)=>s+i.remaining,0);
  const openQuotes=quotes.filter(q=>q.status==='sent'||q.status==='draft');const pipeline=openQuotes.reduce((s,q)=>s+totals(q.lines,q.discount_percent,q.vat_rate).ttc,0);
  const acceptedQuotes=quotes.filter(q=>q.status==='accepted');const acceptedValue=acceptedQuotes.reduce((s,q)=>s+totals(q.lines,q.discount_percent,q.vat_rate).ttc,0);
  const activeMissions=missions.filter(m=>['planned','in_progress','accepted'].includes(m.status));const completedNotInvoiced=missions.filter(m=>m.status==='completed'&&!invoices.some(i=>i.mission_id===m.id));
  const stockLow=inventory.filter(i=>i.quantity<=i.minimum_quantity);const unpaidExpenses=businessExpenses.filter(e=>!e.paid).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);
  const activeTimers=timeEntries.filter(t=>!t.ended_at);const pendingAppointments=appointmentRequests.filter(a=>a.status==='pending');const unreadClientMessages=portalMessages.filter(m=>m.author==='client'&&!m.read).length;
  let health=100;health-=Math.min(25,overdue.length*7);health-=Math.min(15,stockLow.length*3);health-=Math.min(15,completedNotInvoiced.length*5);health-=Math.min(10,pendingAppointments.length*2);health-=Math.min(10,unreadClientMessages*2);health=Math.max(0,health);
  return {invoiceRows,unpaid,overdue,receivables,overdueValue,openQuotes,pipeline,acceptedQuotes,acceptedValue,activeMissions,completedNotInvoiced,stockLow,unpaidExpenses,activeTimers,pendingAppointments,unreadClientMessages,health};
 },[quotes,invoices,missions,businessExpenses,inventory,timeEntries,appointmentRequests,portalMessages]);
 const update=(rows:AutomationItem[])=>{setQueue(rows);save(rows)};
 function generate(){const rows:AutomationItem[]=[];const push=(title:string,detail:string,kind:AutomationItem['kind'],priority:number,route:string)=>rows.push({id:uid(),title,detail,kind,priority,route,done:false,createdAt:new Date().toISOString()});
  if(model.overdue.length)push('Encaisser les factures en retard',`${model.overdue.length} facture(s) · ${euro(model.overdueValue)} à récupérer`,'cash',100,'/follow-ups');
  if(model.completedNotInvoiced.length)push('Facturer les chantiers terminés',`${model.completedNotInvoiced.length} chantier(s) terminés sans facture`,'cash',95,'/invoices');
  if(model.openQuotes.length)push('Relancer le pipeline commercial',`${model.openQuotes.length} devis ouvert(s) · potentiel ${euro(model.pipeline)}`,'sales',90,'/sales-autopilot-v18');
  if(model.pendingAppointments.length)push('Traiter les demandes de rendez-vous',`${model.pendingAppointments.length} demande(s) client en attente`,'sales',85,'/client-experience-v17');
  if(model.unreadClientMessages)push('Répondre aux clients',`${model.unreadClientMessages} message(s) client non lu(s)`,'quality',82,'/client-experience-v17');
  if(model.stockLow.length)push('Sécuriser les stocks critiques',`${model.stockLow.length} article(s) sous le seuil minimum`,'ops',78,'/inventory');
  if(model.activeTimers.length)push('Contrôler les pointages actifs',`${model.activeTimers.length} chronomètre(s) encore actif(s)`,'ops',72,'/time-tracking');
  if(model.unpaidExpenses>0)push('Vérifier les dépenses à payer',`${euro(model.unpaidExpenses)} de dépenses non réglées`,'cash',70,'/expenses');
  if(!rows.length)push('Entreprise sous contrôle','Aucune urgence détectée. Vérifier la semaine et les objectifs.','quality',40,'/weekly-pilot');
  update([...rows,...queue.filter(q=>!q.done)].sort((a,b)=>b.priority-a.priority).slice(0,40));
 }
 const pending=queue.filter(q=>!q.done);
 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 19 · COMPANY AUTOPILOT</p><h1>Pilote automatique de l’entreprise</h1><p>Une seule vue pour savoir quoi encaisser, vendre, facturer et sécuriser maintenant.</p></div><button className="primary" onClick={generate}><Sparkles/>Calculer le plan d’action</button></div>
 <section className="v19-hero"><article><Gauge/><span>Santé entreprise</span><strong>{model.health}/100</strong><small>{model.health>=80?'Situation saine':model.health>=55?'Points à traiter rapidement':'Action immédiate recommandée'}</small></article><article><HandCoins/><span>À encaisser</span><strong>{euro(model.receivables)}</strong><small>{model.overdue.length} en retard</small></article><article><Target/><span>Pipeline devis</span><strong>{euro(model.pipeline)}</strong><small>{model.openQuotes.length} opportunité(s)</small></article><article><Wrench/><span>Chantiers actifs</span><strong>{model.activeMissions.length}</strong><small>{model.completedNotInvoiced.length} à facturer</small></article></section>
 <section className="v19-grid"><div className="panel"><div className="section-heading"><div><p className="eyebrow">AUTOPILOT</p><h2>Plan d’action priorisé</h2></div><button className="ghost" onClick={generate}><RefreshCw/>Recalculer</button></div><div className="stack-list">{pending.map(item=><article className={`v19-action ${item.kind}`} key={item.id}><div className="v19-priority">{item.priority}</div><div><strong>{item.title}</strong><small>{item.detail}</small></div><Link className="ghost compact" to={item.route}><ArrowRight/>Ouvrir</Link><button className="primary compact" onClick={()=>update(queue.map(q=>q.id===item.id?{...q,done:true}:q))}><CheckCircle2/>Fait</button></article>)}{!pending.length&&<div className="empty-state"><BrainCircuit/><strong>Le pilote est prêt.</strong><p>Lance le calcul pour produire les priorités à partir des données réelles de CloserFlow.</p></div>}</div></div>
 <div className="panel"><div className="section-heading"><div><p className="eyebrow">DÉCISION</p><h2>Signaux clés</h2></div><ShieldCheck/></div><div className="v19-signals"><article className={model.overdue.length?'danger':''}><AlertTriangle/><div><span>Impayés en retard</span><strong>{euro(model.overdueValue)}</strong></div></article><article className={model.completedNotInvoiced.length?'warning':''}><FileText/><div><span>Terminés non facturés</span><strong>{model.completedNotInvoiced.length}</strong></div></article><article><TrendingUp/><div><span>Devis acceptés</span><strong>{euro(model.acceptedValue)}</strong></div></article><article><WalletCards/><div><span>Dépenses à payer</span><strong>{euro(model.unpaidExpenses)}</strong></div></article><article><Clock3/><div><span>Rendez-vous à traiter</span><strong>{model.pendingAppointments.length}</strong></div></article><article><Banknote/><div><span>Messages clients non lus</span><strong>{model.unreadClientMessages}</strong></div></article></div></div></section>
 <section className="panel"><div className="section-heading"><div><p className="eyebrow">RACCOURCIS DIRIGEANT</p><h2>Passer de la décision à l’exécution</h2></div><Play/></div><div className="v19-shortcuts"><Link to="/sales-autopilot-v18"><Target/>Vendre</Link><Link to="/finance-autopilot"><HandCoins/>Encaisser</Link><Link to="/planning"><Clock3/>Planifier</Link><Link to="/inventory"><Wrench/>Stock</Link><Link to="/executive-intelligence"><BrainCircuit/>Analyser</Link></div></section></>;
}
