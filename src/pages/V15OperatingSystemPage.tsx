import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BadgeEuro, Boxes, BriefcaseBusiness, CalendarClock,
  CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Gauge, HandCoins,
  HeartPulse, ListTodo, PackageCheck, Radar, RefreshCcw, Search, ShieldCheck,
  Sparkles, Target, TrendingUp, UserRoundCheck, Users, WalletCards, WandSparkles
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

type Tab = 'today'|'money'|'jobs'|'team'|'clients'|'risks';
type Priority = 'critical'|'high'|'normal';
type ActionItem = {id:string; title:string; detail:string; href:string; priority:Priority; metric?:string};
type GoalState = {monthlyRevenue:number; monthlyCash:number; targetMargin:number; maxOverdue:number; weeklyHours:number};

type FocusTask = {id:string; title:string; done:boolean; createdAt:string};

const euro = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const pct = (v:number)=>`${Math.round(v)} %`;
const day = 86400000;
const todayKey = new Date().toISOString().slice(0,10);
const monthKey = todayKey.slice(0,7);
const sum = (xs:number[])=>xs.reduce((a,b)=>a+b,0);
const lineHT=(d:{lines:{quantity:number;unit_price_ht:number}[];discount_percent:number})=>{
  const gross=sum(d.lines.map(l=>Number(l.quantity||0)*Number(l.unit_price_ht||0)));
  return gross*(1-(Number(d.discount_percent||0)/100));
};
const invPaid=(i:{payments:{amount:number}[]})=>sum((i.payments||[]).map(p=>Number(p.amount||0)));
const clamp=(n:number,min=0,max=100)=>Math.min(max,Math.max(min,n));
const lsRead=<T,>(key:string,fallback:T):T=>{try{const v=localStorage.getItem(key);return v?JSON.parse(v) as T:fallback}catch{return fallback}};

export function V15OperatingSystemPage(){
 const data=useAppData();
 const {clients,missions,quotes,invoices,team,inventory,timeEntries,businessExpenses,maintenanceContracts}=data;
 const [tab,setTab]=useState<Tab>('today');
 const [query,setQuery]=useState('');
 const [goals,setGoals]=useState<GoalState>(()=>lsRead('closerflow.v15.goals',{monthlyRevenue:25000,monthlyCash:22000,targetMargin:30,maxOverdue:5000,weeklyHours:35}));
 const [focus,setFocus]=useState<FocusTask[]>(()=>lsRead('closerflow.v15.focus',[]));
 const [draft,setDraft]=useState('');

 const stats=useMemo(()=>{
  const now=Date.now();
  const monthInvoices=invoices.filter(i=>i.created_at?.slice(0,7)===monthKey);
  const revenueMonth=sum(monthInvoices.map(lineHT));
  const cashMonth=sum(invoices.flatMap(i=>(i.payments||[]).filter(p=>p.paid_at?.slice(0,7)===monthKey).map(p=>Number(p.amount||0))));
  const receivable=sum(invoices.filter(i=>i.status!=='paid').map(i=>Math.max(0,lineHT(i)-invPaid(i))));
  const overdueInvoices=invoices.filter(i=>i.status!=='paid' && i.due_date && new Date(i.due_date).getTime()<now);
  const overdue=sum(overdueInvoices.map(i=>Math.max(0,lineHT(i)-invPaid(i))));
  const acceptedQuotes=quotes.filter(q=>q.status==='accepted');
  const acceptedUnbilled=acceptedQuotes.filter(q=>!invoices.some(i=>i.quote_id===q.id));
  const pipeline=sum(quotes.filter(q=>q.status==='sent'||q.status==='accepted').map(lineHT));
  const quoteClosed=quotes.filter(q=>q.status==='accepted'||q.status==='rejected');
  const conversion=quoteClosed.length?100*quoteClosed.filter(q=>q.status==='accepted').length/quoteClosed.length:0;
  const activeJobs=missions.filter(m=>['accepted','planned','in_progress'].includes(m.status));
  const todayJobs=missions.filter(m=>m.scheduled_start?.slice(0,10)===todayKey);
  const unassigned=activeJobs.filter(m=>!m.assigned_user_id);
  const completedUnbilled=missions.filter(m=>m.status==='completed'&&!invoices.some(i=>i.mission_id===m.id));
  const lowStock=inventory.filter(i=>Number(i.quantity)<=Number(i.minimum_quantity));
  const activeTimers=timeEntries.filter(t=>!t.ended_at);
  const labourCost=sum(timeEntries.map(t=>{
    const end=t.ended_at?new Date(t.ended_at).getTime():now;
    const mins=Math.max(0,(end-new Date(t.started_at).getTime())/60000);
    return mins/60*Number(t.hourly_cost||0);
  }));
  const expenseCost=sum(businessExpenses.map(e=>Number(e.amount_ht||0)));
  const jobRevenue=sum(invoices.filter(i=>i.mission_id).map(lineHT));
  const marginValue=jobRevenue-labourCost-expenseCost;
  const marginPct=jobRevenue>0?100*marginValue/jobRevenue:0;
  const dueContracts=maintenanceContracts.filter(c=>c.active&&new Date(c.next_due_date).getTime()<=now+30*day);
  const incompleteClients=clients.filter(c=>!c.phone||!c.email||!c.address);
  const teamActive=team.filter(t=>t.active);
  const health=clamp(100
    -(overdue>goals.maxOverdue?18:overdue>0?8:0)
    -(unassigned.length?Math.min(15,unassigned.length*4):0)
    -(lowStock.length?Math.min(12,lowStock.length*3):0)
    -(incompleteClients.length?Math.min(10,incompleteClients.length):0)
    -(marginPct>0&&marginPct<goals.targetMargin?15:0)
    -(acceptedUnbilled.length?Math.min(12,acceptedUnbilled.length*4):0));
  return {revenueMonth,cashMonth,receivable,overdue,overdueInvoices,acceptedUnbilled,pipeline,conversion,activeJobs,todayJobs,unassigned,completedUnbilled,lowStock,activeTimers,labourCost,expenseCost,jobRevenue,marginValue,marginPct,dueContracts,incompleteClients,teamActive,health};
 },[clients,missions,quotes,invoices,team,inventory,timeEntries,businessExpenses,maintenanceContracts,goals]);

 const actions=useMemo<ActionItem[]>(()=>{
  const out:ActionItem[]=[];
  if(stats.overdue>0) out.push({id:'overdue',title:'Encaisser les factures en retard',detail:`${stats.overdueInvoices.length} facture(s) à relancer`,href:'/finance-autopilot',priority:stats.overdue>goals.maxOverdue?'critical':'high',metric:euro.format(stats.overdue)});
  if(stats.acceptedUnbilled.length) out.push({id:'quotes',title:'Facturer les devis acceptés',detail:`${stats.acceptedUnbilled.length} opportunité(s) déjà gagnée(s)`,href:'/quotes',priority:'critical',metric:euro.format(sum(stats.acceptedUnbilled.map(lineHT)))});
  if(stats.completedUnbilled.length) out.push({id:'jobsbill',title:'Facturer les chantiers terminés',detail:`${stats.completedUnbilled.length} chantier(s) clos sans facture`,href:'/missions',priority:'critical'});
  if(stats.unassigned.length) out.push({id:'assign',title:'Affecter les chantiers sans responsable',detail:`${stats.unassigned.length} chantier(s) à distribuer`,href:'/smart-planning',priority:'high'});
  if(stats.lowStock.length) out.push({id:'stock',title:'Réapprovisionner le stock',detail:`${stats.lowStock.length} article(s) au seuil ou sous le seuil`,href:'/supply-chain',priority:'high'});
  if(stats.dueContracts.length) out.push({id:'maintenance',title:'Planifier les maintenances à venir',detail:`${stats.dueContracts.length} contrat(s) dans les 30 jours`,href:'/sav-maintenance',priority:'normal'});
  if(stats.incompleteClients.length) out.push({id:'quality',title:'Compléter les fiches clients',detail:`${stats.incompleteClients.length} fiche(s) incomplète(s)`,href:'/clients',priority:'normal'});
  if(stats.marginPct>0&&stats.marginPct<goals.targetMargin) out.push({id:'margin',title:'Protéger la marge chantier',detail:`Marge actuelle ${pct(stats.marginPct)} sous l’objectif ${goals.targetMargin}%`,href:'/profitability',priority:'high',metric:euro.format(stats.marginValue)});
  return out;
 },[stats,goals]);

 const searchResults=useMemo(()=>{
  const q=query.trim().toLowerCase(); if(!q)return [];
  const rows=[
   ...clients.map(c=>({type:'Client',title:(c.company_name||`${c.first_name} ${c.last_name}`).trim(),sub:c.phone||c.email||'',href:'/clients'})),
   ...missions.map(m=>({type:'Chantier',title:m.title,sub:m.address||m.status,href:`/missions/${m.id}`})),
   ...quotes.map(d=>({type:'Devis',title:`${d.number} · ${d.title}`,sub:d.status,href:`/quotes/${d.id}`})),
   ...invoices.map(d=>({type:'Facture',title:`${d.number} · ${d.title}`,sub:d.status,href:`/invoices/${d.id}`})),
  ];
  return rows.filter(r=>(`${r.type} ${r.title} ${r.sub}`).toLowerCase().includes(q)).slice(0,8);
 },[query,clients,missions,quotes,invoices]);

 const saveGoals=(next:GoalState)=>{setGoals(next);localStorage.setItem('closerflow.v15.goals',JSON.stringify(next))};
 const saveFocus=(next:FocusTask[])=>{setFocus(next);localStorage.setItem('closerflow.v15.focus',JSON.stringify(next))};
 const addFocus=()=>{const t=draft.trim();if(!t)return;saveFocus([{id:`f-${Date.now()}`,title:t,done:false,createdAt:new Date().toISOString()},...focus]);setDraft('')};
 const navTabs:[Tab,string,ReactNode][]=[['today','Aujourd’hui',<Sparkles key="a"/>],['money','Argent',<BadgeEuro key="b"/>],['jobs','Chantiers',<BriefcaseBusiness key="c"/>],['team','Équipe',<Users key="d"/>],['clients','Clients',<UserRoundCheck key="e"/>],['risks','Risques',<ShieldCheck key="f"/>]];

 return <div className="v15-page">
  <div className="page-title v15-title"><div><p className="eyebrow">CLOSERFLOW 15 · OPERATING SYSTEM</p><h1>Centre de pilotage</h1><p>Une vue unique pour décider, encaisser, produire et corriger.</p></div><div className={`v15-health ${stats.health>=80?'good':stats.health>=60?'mid':'bad'}`}><HeartPulse/><div><span>Santé entreprise</span><strong>{Math.round(stats.health)}/100</strong></div></div></div>

  <section className="v15-command panel"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher client, chantier, devis ou facture…"/>{query&&<button className="ghost" onClick={()=>setQuery('')}>Effacer</button>}</section>
  {query&&<section className="v15-search-results panel">{searchResults.length?searchResults.map((r,i)=><Link key={`${r.type}-${i}`} to={r.href}><span>{r.type}</span><div><strong>{r.title}</strong><small>{r.sub}</small></div><ChevronRight/></Link>):<div className="empty-state">Aucun résultat</div>}</section>}

  <section className="v15-kpis metric-grid">
   <article><CircleDollarSign/><span>CA du mois</span><strong>{euro.format(stats.revenueMonth)}</strong><small>{pct(goals.monthlyRevenue?100*stats.revenueMonth/goals.monthlyRevenue:0)} de l’objectif</small></article>
   <article><HandCoins/><span>Encaissé ce mois</span><strong>{euro.format(stats.cashMonth)}</strong><small>{pct(goals.monthlyCash?100*stats.cashMonth/goals.monthlyCash:0)} de l’objectif</small></article>
   <article className={stats.overdue?'danger':''}><AlertTriangle/><span>En retard</span><strong>{euro.format(stats.overdue)}</strong><small>{stats.overdueInvoices.length} facture(s)</small></article>
   <article><TrendingUp/><span>Marge réelle</span><strong>{pct(stats.marginPct)}</strong><small>{euro.format(stats.marginValue)}</small></article>
   <article><BriefcaseBusiness/><span>Chantiers actifs</span><strong>{stats.activeJobs.length}</strong><small>{stats.todayJobs.length} aujourd’hui</small></article>
   <article className={stats.lowStock.length?'warning':''}><Boxes/><span>Stock critique</span><strong>{stats.lowStock.length}</strong><small>article(s) à traiter</small></article>
  </section>

  <nav className="v15-tabs">{navTabs.map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{icon}{label}</button>)}</nav>

  {tab==='today'&&<div className="v15-layout">
   <section className="panel v15-main"><div className="section-head"><div><p className="eyebrow">PRIORITÉS</p><h2>Ce qui mérite ton attention</h2></div><span className="count-pill">{actions.length}</span></div><div className="v15-actions">{actions.length?actions.map(a=><Link key={a.id} to={a.href} className={`v15-action ${a.priority}`}><div className="priority-dot"/><div><strong>{a.title}</strong><small>{a.detail}</small></div>{a.metric&&<b>{a.metric}</b>}<ArrowRight/></Link>):<div className="empty-state"><CheckCircle2/>Aucune alerte prioritaire.</div>}</div></section>
   <aside className="panel"><div className="section-head"><div><p className="eyebrow">FOCUS</p><h2>Mes 3 actions</h2></div><ListTodo/></div><div className="v15-focus-add"><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addFocus()} placeholder="Ajouter une priorité…"/><button onClick={addFocus}>Ajouter</button></div><div className="v15-focus">{focus.slice(0,6).map(t=><label key={t.id} className={t.done?'done':''}><input type="checkbox" checked={t.done} onChange={()=>saveFocus(focus.map(x=>x.id===t.id?{...x,done:!x.done}:x))}/><span>{t.title}</span><button onClick={()=>saveFocus(focus.filter(x=>x.id!==t.id))}>×</button></label>)}{!focus.length&&<small>Ajoute les actions que tu veux absolument terminer aujourd’hui.</small>}</div></aside>
   <section className="panel"><div className="section-head"><div><p className="eyebrow">AGENDA</p><h2>Chantiers aujourd’hui</h2></div><CalendarClock/></div><div className="v15-list">{stats.todayJobs.length?stats.todayJobs.map(m=><Link key={m.id} to={`/missions/${m.id}`}><div><strong>{m.title}</strong><small>{m.address||'Adresse non renseignée'}</small></div><span>{m.scheduled_start?new Date(m.scheduled_start).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—'}</span></Link>):<div className="empty-state">Aucun chantier planifié aujourd’hui.</div>}</div></section>
   <section className="panel"><div className="section-head"><div><p className="eyebrow">RACCOURCIS</p><h2>Exécuter maintenant</h2></div><WandSparkles/></div><div className="v15-quick"><Link to="/missions/new"><BriefcaseBusiness/><strong>Nouveau chantier</strong></Link><Link to="/quotes"><CircleDollarSign/><strong>Nouveau devis</strong></Link><Link to="/time-tracking"><Clock3/><strong>Pointage</strong></Link><Link to="/stock-scanner"><PackageCheck/><strong>Scanner stock</strong></Link></div></section>
  </div>}

  {tab==='money'&&<div className="v15-layout"><section className="panel v15-main"><div className="section-head"><div><p className="eyebrow">TRÉSORERIE</p><h2>Cash & facturation</h2></div><WalletCards/></div><div className="v15-money-grid"><article><span>À encaisser</span><strong>{euro.format(stats.receivable)}</strong></article><article><span>En retard</span><strong>{euro.format(stats.overdue)}</strong></article><article><span>Pipeline devis</span><strong>{euro.format(stats.pipeline)}</strong></article><article><span>Conversion</span><strong>{pct(stats.conversion)}</strong></article></div><div className="v15-actions">{stats.overdueInvoices.slice(0,8).map(i=><Link className="v15-action critical" key={i.id} to={`/invoices/${i.id}`}><div className="priority-dot"/><div><strong>{i.number} · {i.title}</strong><small>Échéance {i.due_date?new Date(i.due_date).toLocaleDateString('fr-FR'):'—'}</small></div><b>{euro.format(Math.max(0,lineHT(i)-invPaid(i)))}</b><ChevronRight/></Link>)}</div></section><aside className="panel"><div className="section-head"><h2>Objectifs financiers</h2><Target/></div><div className="v15-goals"><label>CA mensuel<input type="number" value={goals.monthlyRevenue} onChange={e=>saveGoals({...goals,monthlyRevenue:Number(e.target.value)})}/></label><label>Encaissement mensuel<input type="number" value={goals.monthlyCash} onChange={e=>saveGoals({...goals,monthlyCash:Number(e.target.value)})}/></label><label>Retard maximum<input type="number" value={goals.maxOverdue} onChange={e=>saveGoals({...goals,maxOverdue:Number(e.target.value)})}/></label></div><Link className="button-link" to="/finance-autopilot">Ouvrir Finance Autopilot</Link></aside></div>}

  {tab==='jobs'&&<div className="v15-layout"><section className="panel v15-main"><div className="section-head"><div><p className="eyebrow">PRODUCTION</p><h2>Chantiers à sécuriser</h2></div><BriefcaseBusiness/></div><div className="v15-list">{stats.activeJobs.slice(0,20).map(m=><Link key={m.id} to={`/missions/${m.id}`}><div><strong>{m.title}</strong><small>{m.address||'Sans adresse'} · {m.status}</small></div><span className={!m.assigned_user_id?'risk-text':''}>{m.assigned_user_id?'Affecté':'À affecter'}</span></Link>)}</div></section><aside className="panel"><div className="section-head"><h2>Protection de marge</h2><Gauge/></div><div className="v15-score"><strong>{pct(stats.marginPct)}</strong><span>Objectif {goals.targetMargin}%</span></div><label className="v15-range">Marge cible<input type="range" min="5" max="60" value={goals.targetMargin} onChange={e=>saveGoals({...goals,targetMargin:Number(e.target.value)})}/></label><Link className="button-link" to="/profitability">Analyser la rentabilité</Link></aside></div>}

  {tab==='team'&&<div className="v15-layout"><section className="panel v15-main"><div className="section-head"><div><p className="eyebrow">ÉQUIPE</p><h2>Disponibilité & charge</h2></div><Users/></div><div className="v15-team">{stats.teamActive.map(u=>{const assigned=stats.activeJobs.filter(m=>m.assigned_user_id===u.id).length;const running=stats.activeTimers.some(t=>t.user_id===u.id);return <article key={u.id}><div className="avatar-dot" style={{background:u.color}}>{u.name.slice(0,1).toUpperCase()}</div><div><strong>{u.name}</strong><small>{u.role} · {assigned} chantier(s)</small></div><span className={running?'online':'idle'}>{running?'En pointage':'Disponible'}</span></article>})}</div></section><aside className="panel"><div className="section-head"><h2>Capacité</h2><Clock3/></div><div className="v15-score"><strong>{goals.weeklyHours} h</strong><span>capacité cible / personne</span></div><label className="v15-range">Heures hebdomadaires<input type="range" min="10" max="60" value={goals.weeklyHours} onChange={e=>saveGoals({...goals,weeklyHours:Number(e.target.value)})}/></label><Link className="button-link" to="/workload-forecast">Prévision de charge</Link></aside></div>}

  {tab==='clients'&&<div className="v15-layout"><section className="panel v15-main"><div className="section-head"><div><p className="eyebrow">CLIENTS</p><h2>Portefeuille</h2></div><UserRoundCheck/></div><div className="v15-client-grid"><article><strong>{clients.length}</strong><span>clients</span></article><article><strong>{stats.incompleteClients.length}</strong><span>fiches incomplètes</span></article><article><strong>{stats.conversion.toFixed(0)}%</strong><span>conversion devis</span></article><article><strong>{stats.dueContracts.length}</strong><span>maintenances &lt; 30 j</span></article></div><div className="v15-list">{stats.incompleteClients.slice(0,12).map(c=><Link to="/clients" key={c.id}><div><strong>{c.company_name||`${c.first_name} ${c.last_name}`}</strong><small>{[!c.phone&&'téléphone',!c.email&&'e-mail',!c.address&&'adresse'].filter(Boolean).join(' · ')} manquant(s)</small></div><ShieldCheck/></Link>)}</div></section><aside className="panel"><div className="section-head"><h2>Développement</h2><TrendingUp/></div><p>Le meilleur prochain mouvement commercial dépend du pipeline, de la conversion et des clients actifs.</p><Link className="button-link" to="/commercial-crm">Ouvrir le CRM</Link><Link className="button-link" to="/revenue-ops">Revenue Ops</Link></aside></div>}

  {tab==='risks'&&<div className="v15-layout"><section className="panel v15-main"><div className="section-head"><div><p className="eyebrow">RISQUES</p><h2>Contrôle automatique</h2></div><Radar/></div><div className="v15-risk-grid"><article className={stats.overdue?'bad':'good'}><AlertTriangle/><strong>{euro.format(stats.overdue)}</strong><span>impayés</span></article><article className={stats.unassigned.length?'bad':'good'}><Users/><strong>{stats.unassigned.length}</strong><span>sans responsable</span></article><article className={stats.lowStock.length?'bad':'good'}><Boxes/><strong>{stats.lowStock.length}</strong><span>stock critique</span></article><article className={stats.acceptedUnbilled.length?'bad':'good'}><CircleDollarSign/><strong>{stats.acceptedUnbilled.length}</strong><span>devis à facturer</span></article><article className={stats.incompleteClients.length?'mid':'good'}><UserRoundCheck/><strong>{stats.incompleteClients.length}</strong><span>clients incomplets</span></article><article className={stats.marginPct>0&&stats.marginPct<goals.targetMargin?'bad':'good'}><TrendingUp/><strong>{pct(stats.marginPct)}</strong><span>marge réelle</span></article></div></section><aside className="panel"><div className="section-head"><h2>Score global</h2><HeartPulse/></div><div className={`v15-big-health ${stats.health>=80?'good':stats.health>=60?'mid':'bad'}`}><strong>{Math.round(stats.health)}</strong><span>/100</span></div><p>{stats.health>=80?'Entreprise sous contrôle. Concentre-toi sur la croissance.':stats.health>=60?'Quelques points doivent être traités pour sécuriser la semaine.':'Priorité à la trésorerie, au planning et à la qualité des données.'}</p><Link className="button-link" to="/automation-hub">Lancer Automation Hub</Link></aside></div>}

  <footer className="v15-footer"><span><ShieldCheck/> Analyse locale, aucune donnée envoyée à un service IA externe.</span><button className="ghost" onClick={()=>location.reload()}><RefreshCcw/> Actualiser</button></footer>
 </div>
}
