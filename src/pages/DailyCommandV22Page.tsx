import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, BadgeEuro, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardCheck, Flame, Gauge, Goal, MessageCircleMore, PackageSearch, RefreshCw, Sparkles, Target, TrendingUp, UsersRound } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { totals } from '../lib/documents';

type Focus='cash'|'sales'|'ops'|'clients';
type DailyItem={id:string;title:string;detail:string;score:number;route:string;kind:Focus;metric?:string};
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const KEY='closerflow.v22.daily';
const defaults={goalRevenue:10000,focus:'cash' as Focus};
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaults}}

export function DailyCommandV22Page(){
 const {invoices,quotes,missions,clients,portalMessages,appointmentRequests,inventory,businessExpenses}=useAppData();
 const [settings,setSettings]=useState(load);
 const [done,setDone]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(KEY+'.done')||'[]')}catch{return []}});
 const save=(x:typeof defaults)=>{setSettings(x);localStorage.setItem(KEY,JSON.stringify(x))};
 const toggle=(id:string)=>{const n=done.includes(id)?done.filter(x=>x!==id):[...done,id];setDone(n);localStorage.setItem(KEY+'.done',JSON.stringify(n))};

 const data=useMemo(()=>{
  const overdue=invoices.reduce((s,i)=>{if(i.status!=='overdue')return s;const t=totals(i.lines,i.discount_percent,i.vat_rate).ttc;const p=(i.payments??[]).reduce((a,x)=>a+x.amount,0);return s+Math.max(0,t-p)},0);
  const sentQuotes=quotes.filter(q=>q.status==='sent');
  const pipeline=sentQuotes.reduce((s,q)=>s+totals(q.lines,q.discount_percent,q.vat_rate).ttc,0);
  const accepted=quotes.filter(q=>q.status==='accepted').reduce((s,q)=>s+totals(q.lines,q.discount_percent,q.vat_rate).ttc,0);
  const activeMissions=missions.filter(m=>m.status==='planned'||m.status==='in_progress');
  const completedUnbilled=missions.filter(m=>m.status==='completed'&&!invoices.some(i=>i.mission_id===m.id));
  const unread=portalMessages.filter(i=>i.author==='client'&&!i.read).length;
  const pendingAppointments=appointmentRequests.filter(a=>a.status==='pending').length;
  const lowStock=inventory.filter(s=>s.quantity<=s.minimum_quantity).length;
  const unpaidExpenses=businessExpenses.filter(e=>!e.paid).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);

  const items:DailyItem[]=[];
  if(overdue>0)items.push({id:'overdue',title:'Récupérer les impayés',detail:'Commencer par les factures en retard les plus anciennes.',score:100,route:'/follow-ups',kind:'cash',metric:euro.format(overdue)});
  if(completedUnbilled.length)items.push({id:'unbilled',title:'Facturer les chantiers terminés',detail:`${completedUnbilled.length} mission(s) terminée(s) attendent une facture.`,score:96,route:'/invoices',kind:'cash'});
  if(sentQuotes.length)items.push({id:'quotes',title:'Relancer les devis ouverts',detail:`${sentQuotes.length} devis représentent ${euro.format(pipeline)} de potentiel.`,score:92,route:'/sales-autopilot-v18',kind:'sales'});
  if(pendingAppointments)items.push({id:'appointments',title:'Traiter les demandes de rendez-vous',detail:`${pendingAppointments} demande(s) en attente de réponse.`,score:86,route:'/client-experience-v17',kind:'clients'});
  if(unread)items.push({id:'messages',title:'Répondre aux clients',detail:`${unread} message(s) entrant(s) non lu(s).`,score:84,route:'/client-experience-v17',kind:'clients'});
  if(activeMissions.length)items.push({id:'missions',title:'Sécuriser les chantiers actifs',detail:`${activeMissions.length} intervention(s) planifiée(s) ou en cours.`,score:80,route:'/missions',kind:'ops'});
  if(lowStock)items.push({id:'stock',title:'Réapprovisionner le stock critique',detail:`${lowStock} article(s) sous le seuil minimum.`,score:72,route:'/inventory',kind:'ops'});
  if(unpaidExpenses>0)items.push({id:'expenses',title:'Anticiper les sorties',detail:`${euro.format(unpaidExpenses)} de dépenses restent à payer.`,score:68,route:'/expenses',kind:'cash'});

  const revenueProgress=Math.min(100,Math.round((accepted/Math.max(1,settings.goalRevenue))*100));
  const health=Math.max(0,Math.min(100,100-(overdue>0?20:0)-(completedUnbilled.length?10:0)-(unread>5?10:0)-(lowStock>3?10:0)-(pendingAppointments>3?10:0)));
  return {overdue,pipeline,accepted,active:activeMissions.length,unread,pendingAppointments,lowStock,unpaidExpenses,items:[...items].sort((a,b)=>b.score-a.score),revenueProgress,health};
 },[invoices,quotes,missions,clients,portalMessages,appointmentRequests,inventory,businessExpenses,settings.goalRevenue]);

 const focused=data.items.filter(i=>i.kind===settings.focus);
 const queue=(focused.length?focused:data.items).slice(0,8);

 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 22 · DAILY COMMAND</p><h1>Centre de pilotage quotidien</h1><p>Une seule vue pour savoir quoi faire maintenant, dans quel ordre et pourquoi.</p></div><Link className="primary" to="/company-autopilot-v19"><Sparkles/>Company Autopilot</Link></div>
 <section className="v22-hero"><article><Gauge/><div><span>Score opérationnel</span><strong>{data.health}/100</strong><small>Calculé sur les alertes actives</small></div></article><article><Goal/><div><span>Objectif CA</span><strong>{data.revenueProgress}%</strong><small>{euro.format(data.accepted)} / {euro.format(settings.goalRevenue)}</small></div></article><article><BadgeEuro/><div><span>Pipeline devis</span><strong>{euro.format(data.pipeline)}</strong><small>Devis envoyés</small></div></article><article><BriefcaseBusiness/><div><span>Chantiers actifs</span><strong>{data.active}</strong><small>Planifiés ou en cours</small></div></article></section>
 <section className="v22-grid"><div className="panel"><div className="section-heading"><div><p className="eyebrow">FOCUS</p><h2>Mode de travail</h2></div><Target/></div><div className="v22-focus">{(['cash','sales','ops','clients'] as Focus[]).map(f=><button key={f} className={settings.focus===f?'active':''} onClick={()=>save({...settings,focus:f})}>{f==='cash'?<CircleDollarSign/>:f==='sales'?<TrendingUp/>:f==='ops'?<Activity/>:<UsersRound/>}{f==='cash'?'Cash':f==='sales'?'Ventes':f==='ops'?'Opérations':'Clients'}</button>)}</div><label className="v22-goal">Objectif CA mensuel<input type="number" value={settings.goalRevenue} onChange={e=>save({...settings,goalRevenue:Number(e.target.value)})}/></label><button className="ghost" onClick={()=>save(defaults)}><RefreshCw/>Réinitialiser</button></div>
 <div className="panel"><div className="section-heading"><div><p className="eyebrow">SIGNAL</p><h2>Vue instantanée</h2></div><Flame/></div><div className="v22-signal"><span><AlertTriangle/>Impayés <b>{euro.format(data.overdue)}</b></span><span><MessageCircleMore/>Messages <b>{data.unread}</b></span><span><CalendarDays/>RDV en attente <b>{data.pendingAppointments}</b></span><span><PackageSearch/>Stock critique <b>{data.lowStock}</b></span></div></div></section>
 <section className="panel"><div className="section-heading"><div><p className="eyebrow">MAINTENANT</p><h2>File d'actions priorisée</h2></div><ClipboardCheck/></div><div className="v22-queue">{queue.map(i=><article key={i.id} className={done.includes(i.id)?'done':''}><button className="v22-check" onClick={()=>toggle(i.id)}>{done.includes(i.id)?<CheckCircle2/>:<span/>}</button><Link to={i.route}><div><strong>{i.title}</strong><small>{i.detail}</small></div>{i.metric&&<b>{i.metric}</b>}<em>Priorité {i.score}</em><ArrowRight/></Link></article>)}{!queue.length&&<div className="empty-state"><CheckCircle2/><strong>Rien d'urgent</strong><p>Les données actuelles ne montrent aucune action prioritaire.</p></div>}</div></section></>;
}
