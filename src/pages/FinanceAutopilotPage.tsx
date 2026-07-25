import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, CalendarClock, CheckCircle2, CircleDollarSign, Download, FilePlus2, Gauge, HandCoins, Landmark, ListTodo, RefreshCw, Send, ShieldCheck, Sparkles, Target, TrendingUp, WalletCards } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const DAY=86400000;
const SETTINGS_KEY='closerflow.financeAutopilot.settings.v14_1';
const ACTIONS_KEY='closerflow.financeAutopilot.actions.v14_1';
type Settings={cashFloor:number,reserveTarget:number,defaultDueDays:number,reminderDays:number,monthlyRevenueTarget:number,monthlyCollectionTarget:number};
type Action={id:string,title:string,detail:string,amount:number,href:string,priority:'critical'|'warning'|'opportunity',done:boolean};
const defaults:Settings={cashFloor:5000,reserveTarget:10000,defaultDueDays:30,reminderDays:7,monthlyRevenueTarget:15000,monthlyCollectionTarget:12000};
const read=<T,>(key:string,fallback:T):T=>{try{return {...(fallback as any),...JSON.parse(localStorage.getItem(key)||'{}')} as T}catch{return fallback}};
const euro=(v:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(v)?v:0);
const pct=(v:number)=>`${(Number.isFinite(v)?v:0).toFixed(0)} %`;
const lineHT=(d:any)=>(d.lines||[]).reduce((s:number,l:any)=>s+(Number(l.quantity)||0)*(Number(l.unit_price_ht)||0),0)*(1-(Number(d.discount_percent)||0)/100);
const ttc=(i:any)=>lineHT(i)*(1+(Number(i.vat_rate)||0)/100);
const paid=(i:any)=>(i.payments||[]).reduce((s:number,p:any)=>s+(Number(p.amount)||0),0);
const monthStart=()=>new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
const download=(name:string,content:string)=>{const u=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)};

export function FinanceAutopilotPage(){
 const {clients,missions,quotes,invoices,businessExpenses,maintenanceContracts,convertQuoteToInvoice,addInvoicePayment}=useAppData();
 const [settings,setSettings]=useState<Settings>(()=>read(SETTINGS_KEY,defaults));
 const [done,setDone]=useState<Record<string,boolean>>(()=>read(ACTIONS_KEY,{}));
 const [refresh,setRefresh]=useState(0);
 const save=(s:Settings)=>{setSettings(s);localStorage.setItem(SETTINGS_KEY,JSON.stringify(s))};
 const toggle=(id:string)=>{const next={...done,[id]:!done[id]};setDone(next);localStorage.setItem(ACTIONS_KEY,JSON.stringify(next))};
 const model=useMemo(()=>{
  const now=Date.now(),start=monthStart();
  const rows=invoices.map(i=>{const total=ttc(i),received=paid(i),remaining=Math.max(0,total-received),due=i.due_date?new Date(i.due_date).getTime():null;return{i,total,received,remaining,due,lateDays:due&&due<now?Math.ceil((now-due)/DAY):0}});
  const open=rows.filter(x=>x.remaining>.01&&x.i.status!=='draft');
  const overdue=open.filter(x=>x.lateDays>0).sort((a,b)=>b.lateDays-a.lateDays);
  const dueSoon=open.filter(x=>x.due&&x.due>=now&&x.due<=now+settings.reminderDays*DAY);
  const receivable=open.reduce((s,x)=>s+x.remaining,0),overdueAmount=overdue.reduce((s,x)=>s+x.remaining,0);
  const billedMonth=invoices.filter(i=>new Date(i.created_at).getTime()>=start).reduce((s,i)=>s+lineHT(i),0);
  const collectedMonth=invoices.reduce((s,i)=>s+(i.payments||[]).filter((p:any)=>new Date(p.paid_at).getTime()>=start).reduce((a:number,p:any)=>a+Number(p.amount||0),0),0);
  const expensesMonth=businessExpenses.filter(e=>new Date(e.expense_date).getTime()>=start).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);
  const unpaidExpenses=businessExpenses.filter(e=>!e.paid).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);
  const accepted=quotes.filter(q=>q.status==='accepted'&&!invoices.some(i=>i.quote_id===q.id));
  const acceptedValue=accepted.reduce((s,q)=>s+lineHT(q),0);
  const completed=missions.filter(m=>m.status==='completed'&&!invoices.some(i=>i.mission_id===m.id));
  const recurring=maintenanceContracts.filter(c=>c.active).reduce((s,c)=>s+c.amount_ht/(c.frequency==='monthly'?1:c.frequency==='quarterly'?3:12),0);
  const projected30=receivable*.65+acceptedValue*.55+recurring-unpaidExpenses;
  const collectionRate=settings.monthlyCollectionTarget?collectedMonth/settings.monthlyCollectionTarget*100:100;
  const revenueRate=settings.monthlyRevenueTarget?billedMonth/settings.monthlyRevenueTarget*100:100;
  const actions:Action[]=[];
  overdue.slice(0,8).forEach(x=>actions.push({id:`late-${x.i.id}`,title:`Relancer ${x.i.number}`,detail:`${x.lateDays} j de retard · ${x.i.title}`,amount:x.remaining,href:`/invoices/${x.i.id}`,priority:x.lateDays>30?'critical':'warning',done:!!done[`late-${x.i.id}`]}));
  accepted.slice(0,6).forEach(q=>actions.push({id:`quote-${q.id}`,title:`Facturer ${q.number}`,detail:q.title,amount:lineHT(q),href:'/quotes',priority:'opportunity',done:!!done[`quote-${q.id}`]}));
  completed.slice(0,5).forEach(m=>actions.push({id:`mission-${m.id}`,title:'Clôturer la facturation chantier',detail:m.title,amount:m.price_ht||0,href:`/missions/${m.id}`,priority:'warning',done:!!done[`mission-${m.id}`]}));
  const health=Math.max(0,100-(overdue.length?20:0)-(accepted.length?10:0)-(completed.length?10:0)-(collectionRate<75?15:0)-(projected30<settings.cashFloor?20:0));
  const aging=[{label:'À échoir',amount:open.filter(x=>!x.lateDays).reduce((s,x)=>s+x.remaining,0)},{label:'1–30 j',amount:overdue.filter(x=>x.lateDays<=30).reduce((s,x)=>s+x.remaining,0)},{label:'31–60 j',amount:overdue.filter(x=>x.lateDays>30&&x.lateDays<=60).reduce((s,x)=>s+x.remaining,0)},{label:'+60 j',amount:overdue.filter(x=>x.lateDays>60).reduce((s,x)=>s+x.remaining,0)}];
  return{open,overdue,dueSoon,receivable,overdueAmount,billedMonth,collectedMonth,expensesMonth,unpaidExpenses,accepted,acceptedValue,completed,recurring,projected30,collectionRate,revenueRate,actions,health,aging};
 },[invoices,quotes,missions,businessExpenses,maintenanceContracts,settings,done,refresh]);
 const collect=(x:any)=>{if(x.remaining<=0)return;addInvoicePayment(x.i.id,{amount:x.remaining,method:'transfer',note:'Encaissement rapide Finance Autopilot',paid_at:new Date().toISOString()});setRefresh(v=>v+1)};
 const invoiceAccepted=(id:string)=>{const due=new Date(Date.now()+settings.defaultDueDays*DAY).toISOString();convertQuoteToInvoice(id,due);setRefresh(v=>v+1)};
 const exportCsv=()=>download('closerflow-v14-1-finance.csv',['Indicateur;Valeur',`Créances;${model.receivable.toFixed(2)}`,`Échues;${model.overdueAmount.toFixed(2)}`,`CA mois;${model.billedMonth.toFixed(2)}`,`Encaissements mois;${model.collectedMonth.toFixed(2)}`,`Dépenses mois;${model.expensesMonth.toFixed(2)}`,`Projection 30j;${model.projected30.toFixed(2)}`,'','Action;Montant;Priorité;Fait',...model.actions.map(a=>`${a.title.replaceAll(';',',')};${a.amount.toFixed(2)};${a.priority};${a.done?'oui':'non'}`)].join('\n'));
 return <>
  <div className="page-title"><div><p className="eyebrow">FINANCE AUTOPILOT</p><h1>Trésorerie & encaissements v14.1</h1><p className="muted">Une file d’actions financière calculée localement pour facturer plus vite, encaisser plus tôt et anticiper les creux.</p></div><div className="fa-actions"><button className="secondary" onClick={()=>setRefresh(v=>v+1)}><RefreshCw/>Actualiser</button><button className="secondary" onClick={exportCsv}><Download/>CSV</button></div></div>
  <section className="fa-hero"><div><Sparkles/><span><small>Score finance</small><strong>{model.health}/100</strong></span></div><div><b>{euro(model.projected30)}</b><small>projection nette à 30 jours</small></div></section>
  <section className="fa-kpis"><article><CircleDollarSign/><span>CA du mois</span><strong>{euro(model.billedMonth)}</strong><small>{pct(model.revenueRate)} de l’objectif</small></article><article><HandCoins/><span>Encaissé ce mois</span><strong>{euro(model.collectedMonth)}</strong><small>{pct(model.collectionRate)} de l’objectif</small></article><article><Banknote/><span>Créances</span><strong>{euro(model.receivable)}</strong><small>{euro(model.overdueAmount)} en retard</small></article><article><WalletCards/><span>Dépenses mois</span><strong>{euro(model.expensesMonth)}</strong><small>{euro(model.unpaidExpenses)} à payer</small></article></section>
  <div className="fa-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">À FAIRE MAINTENANT</p><h2>File financière priorisée</h2></div><ListTodo/></div><div className="fa-queue">{model.actions.slice(0,14).map(a=><article key={a.id} className={`${a.priority} ${a.done?'done':''}`}><button onClick={()=>toggle(a.id)}>{a.done?<CheckCircle2/>:<Target/>}</button><div><strong>{a.title}</strong><small>{a.detail}</small></div><b>{euro(a.amount)}</b><Link to={a.href}>Ouvrir</Link></article>)}{!model.actions.length&&<p className="muted">Aucune action financière prioritaire.</p>}</div></section>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">CRÉANCES</p><h2>Âge des encours</h2></div><Landmark/></div><div className="fa-aging">{model.aging.map(x=><article key={x.label}><span>{x.label}</span><strong>{euro(x.amount)}</strong><i style={{width:`${model.receivable?Math.min(100,x.amount/model.receivable*100):0}%`}}/></article>)}</div><div className="fa-mini"><article><CalendarClock/><span>Échéance sous {settings.reminderDays} j</span><strong>{model.dueSoon.length}</strong></article><article><AlertTriangle/><span>Factures échues</span><strong>{model.overdue.length}</strong></article></div></section></div>
  <div className="fa-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">ENCAISSEMENTS</p><h2>Factures à traiter</h2></div><Send/></div><div className="fa-list">{model.open.slice(0,10).map(x=><article key={x.i.id}><span><strong>{x.i.number}</strong><small>{x.i.title}{x.lateDays?` · ${x.lateDays} j de retard`:''}</small></span><b>{euro(x.remaining)}</b><button className="secondary" onClick={()=>collect(x)}>Encaissé</button><Link to={`/invoices/${x.i.id}`}>Voir</Link></article>)}</div></section>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">FACTURATION</p><h2>CA gagné à transformer</h2></div><FilePlus2/></div><div className="fa-list">{model.accepted.slice(0,8).map(q=><article key={q.id}><span><strong>{q.number}</strong><small>{q.title}</small></span><b>{euro(lineHT(q))}</b><button className="secondary" onClick={()=>invoiceAccepted(q.id)}>Facturer</button></article>)}{!model.accepted.length&&<p className="muted">Tous les devis acceptés sont facturés.</p>}</div></section></div>
  <div className="fa-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">OBJECTIFS</p><h2>Réglages finance</h2></div><Gauge/></div><div className="fa-settings"><label>CA mensuel cible (€)<input type="number" value={settings.monthlyRevenueTarget} onChange={e=>save({...settings,monthlyRevenueTarget:Number(e.target.value)})}/></label><label>Encaissements cible (€)<input type="number" value={settings.monthlyCollectionTarget} onChange={e=>save({...settings,monthlyCollectionTarget:Number(e.target.value)})}/></label><label>Plancher trésorerie (€)<input type="number" value={settings.cashFloor} onChange={e=>save({...settings,cashFloor:Number(e.target.value)})}/></label><label>Réserve cible (€)<input type="number" value={settings.reserveTarget} onChange={e=>save({...settings,reserveTarget:Number(e.target.value)})}/></label><label>Échéance facture (jours)<input type="number" value={settings.defaultDueDays} onChange={e=>save({...settings,defaultDueDays:Number(e.target.value)})}/></label><label>Alerte avant échéance (jours)<input type="number" value={settings.reminderDays} onChange={e=>save({...settings,reminderDays:Number(e.target.value)})}/></label></div></section>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">SYNTHÈSE</p><h2>Ce que le pilote voit</h2></div><ShieldCheck/></div><div className="fa-summary"><article><span>Devis gagnés non facturés</span><strong>{model.accepted.length}</strong><small>{euro(model.acceptedValue)}</small></article><article><span>Chantiers terminés non facturés</span><strong>{model.completed.length}</strong></article><article><span>Revenu récurrent mensuel</span><strong>{euro(model.recurring)}</strong></article><article><span>Projection vs plancher</span><strong className={model.projected30<settings.cashFloor?'bad':'good'}>{euro(model.projected30-settings.cashFloor)}</strong></article></div></section></div>
  <section className="fa-shortcuts"><Link to="/executive-intelligence"><TrendingUp/>Direction intelligente</Link><Link to="/revenue-ops"><HandCoins/>Revenue Ops</Link><Link to="/cashflow"><Landmark/>Trésorerie</Link><Link to="/expenses"><WalletCards/>Dépenses</Link></section>
 </>;
}
