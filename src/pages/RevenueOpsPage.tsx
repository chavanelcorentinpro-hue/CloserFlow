import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BadgeEuro, Banknote, BarChart3, BriefcaseBusiness,
  CalendarClock, CheckCircle2, CircleDollarSign, ClipboardList, Download,
  FileCheck2, FileWarning, Gauge, HandCoins, MessageSquareText, ReceiptText,
  RefreshCcw, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp,
  UserRoundCheck, UsersRound, WalletCards
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const DAY = 86_400_000;
const euro = (value:number) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(value)?value:0);
const dateLabel = (iso:string|null|undefined) => iso ? new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(iso)) : '—';
const invoiceTotal = (invoice:any) => {
  const ht=(invoice.lines||[]).reduce((sum:number,line:any)=>sum+(Number(line.quantity)||0)*(Number(line.unit_price_ht)||0),0)*(1-(Number(invoice.discount_percent)||0)/100);
  return ht*(1+(Number(invoice.vat_rate)||0)/100);
};
const quoteTotal = (quote:any) => (quote.lines||[]).reduce((sum:number,line:any)=>sum+(Number(line.quantity)||0)*(Number(line.unit_price_ht)||0),0)*(1-(Number(quote.discount_percent)||0)/100);
const hoursBetween=(start:string,end:string|null)=>Math.max(0,((end?new Date(end).getTime():Date.now())-new Date(start).getTime())/3_600_000);
const csvCell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;

interface RevenueTask {
  id:string;
  type:'collection'|'quote'|'mission'|'client';
  title:string;
  detail:string;
  due_at:string;
  entity_id:string;
  done:boolean;
  created_at:string;
}
interface Goals { monthlyRevenue:number; monthlyCollections:number; conversionRate:number; marginRate:number; }
const TASK_KEY='closerflow.revenue-ops.tasks.v13.5';
const GOAL_KEY='closerflow.revenue-ops.goals.v13.5';
const DEFAULT_GOALS:Goals={monthlyRevenue:15000,monthlyCollections:12000,conversionRate:45,marginRate:35};
function readTasks():RevenueTask[]{try{return JSON.parse(localStorage.getItem(TASK_KEY)||'[]')}catch{return []}}
function readGoals():Goals{try{return {...DEFAULT_GOALS,...JSON.parse(localStorage.getItem(GOAL_KEY)||'{}')}}catch{return DEFAULT_GOALS}}

export function RevenueOpsPage(){
  const {
    clients,missions,quotes,invoices,timeEntries,businessExpenses,
    convertQuoteToInvoice,addInvoicePayment,updateQuoteStatus,updateMissionStatus
  }=useAppData();
  const [tasks,setTasks]=useState<RevenueTask[]>(readTasks);
  const [goals,setGoals]=useState<Goals>(readGoals);
  const [tab,setTab]=useState<'overview'|'collections'|'sales'|'margin'|'tasks'>('overview');
  const now=Date.now();
  const month=new Date().toISOString().slice(0,7);

  const model=useMemo(()=>{
    const invoiceRows=invoices.map(invoice=>{
      const total=invoiceTotal(invoice);
      const paid=(invoice.payments||[]).reduce((sum,p)=>sum+(Number(p.amount)||0),0);
      const remaining=Math.max(0,total-paid);
      const due=invoice.due_date?new Date(invoice.due_date).getTime():null;
      const overdueDays=remaining>0&&due&&due<now?Math.floor((now-due)/DAY):0;
      return {invoice,total,paid,remaining,due,overdueDays};
    });
    const billedMonth=invoices.filter(i=>i.created_at.startsWith(month)).reduce((s,i)=>s+invoiceTotal(i),0);
    const collectedMonth=invoices.reduce((sum,i)=>sum+(i.payments||[]).filter(p=>p.paid_at.startsWith(month)).reduce((a,p)=>a+p.amount,0),0);
    const receivable=invoiceRows.reduce((s,r)=>s+r.remaining,0);
    const overdue=invoiceRows.filter(r=>r.remaining>0&&r.overdueDays>0).sort((a,b)=>b.overdueDays-a.overdueDays);
    const buckets={current:0,d1_30:0,d31_60:0,d61_90:0,d90plus:0};
    invoiceRows.forEach(r=>{if(r.remaining<=0)return;if(r.overdueDays<=0)buckets.current+=r.remaining;else if(r.overdueDays<=30)buckets.d1_30+=r.remaining;else if(r.overdueDays<=60)buckets.d31_60+=r.remaining;else if(r.overdueDays<=90)buckets.d61_90+=r.remaining;else buckets.d90plus+=r.remaining});

    const quotesOpen=quotes.filter(q=>['draft','sent'].includes(q.status));
    const acceptedUnbilled=quotes.filter(q=>q.status==='accepted'&&!invoices.some(i=>i.quote_id===q.id));
    const accepted=quotes.filter(q=>q.status==='accepted').length;
    const rejected=quotes.filter(q=>q.status==='rejected').length;
    const decided=accepted+rejected;
    const conversion=decided?accepted/decided*100:0;
    const pipeline=quotesOpen.reduce((s,q)=>s+quoteTotal(q),0)+acceptedUnbilled.reduce((s,q)=>s+quoteTotal(q),0);

    const labourByMission=new Map<string,number>();
    timeEntries.forEach(t=>labourByMission.set(t.mission_id,(labourByMission.get(t.mission_id)||0)+hoursBetween(t.started_at,t.ended_at)*(t.hourly_cost||0)));
    const expenseByMission=new Map<string,number>();
    businessExpenses.filter(e=>e.mission_id).forEach(e=>expenseByMission.set(e.mission_id!, (expenseByMission.get(e.mission_id!)||0)+e.amount_ht));
    const missionMargins=missions.map(m=>{
      const revenue=invoices.filter(i=>i.mission_id===m.id).reduce((s,i)=>s+invoiceTotal(i)/(1+(i.vat_rate||0)/100),0);
      const labour=labourByMission.get(m.id)||0;
      const direct=(m.expenses||[]).reduce((s,e)=>s+(e.amount||0),0)+(expenseByMission.get(m.id)||0);
      const materials=(m.materials||[]).reduce((s,x)=>s+0*x.quantity,0);
      const cost=labour+direct+materials;
      const margin=revenue-cost;
      const rate=revenue>0?margin/revenue*100:0;
      return {mission:m,revenue,labour,direct,cost,margin,rate};
    }).filter(r=>r.revenue>0||r.cost>0).sort((a,b)=>a.rate-b.rate);
    const totalRevenue=missionMargins.reduce((s,r)=>s+r.revenue,0);
    const totalMargin=missionMargins.reduce((s,r)=>s+r.margin,0);
    const marginRate=totalRevenue?totalMargin/totalRevenue*100:0;

    const clientStats=clients.map(client=>{
      const clientInvoices=invoices.filter(i=>i.client_id===client.id);
      const revenue=clientInvoices.reduce((s,i)=>s+invoiceTotal(i),0);
      const outstanding=invoiceRows.filter(r=>r.invoice.client_id===client.id).reduce((s,r)=>s+r.remaining,0);
      const clientQuotes=quotes.filter(q=>q.client_id===client.id);
      const won=clientQuotes.filter(q=>q.status==='accepted').length;
      return {client,revenue,outstanding,quotes:clientQuotes.length,won};
    }).sort((a,b)=>b.revenue-a.revenue);

    return {invoiceRows,billedMonth,collectedMonth,receivable,overdue,buckets,quotesOpen,acceptedUnbilled,conversion,pipeline,missionMargins,totalRevenue,totalMargin,marginRate,clientStats};
  },[invoices,quotes,missions,timeEntries,businessExpenses,clients,month,now]);

  const scores=useMemo(()=>{
    const revenue=Math.min(100,model.billedMonth/Math.max(1,goals.monthlyRevenue)*100);
    const collections=Math.min(100,model.collectedMonth/Math.max(1,goals.monthlyCollections)*100);
    const conversion=Math.min(100,model.conversion/Math.max(1,goals.conversionRate)*100);
    const margin=Math.min(100,Math.max(0,model.marginRate)/Math.max(1,goals.marginRate)*100);
    return {revenue,collections,conversion,margin,global:Math.round((revenue+collections+conversion+margin)/4)};
  },[model,goals]);

  const recommendations=useMemo(()=>{
    const rows:{kind:'critical'|'warning'|'good';title:string;detail:string;href:string}[]=[];
    if(model.overdue.length) rows.push({kind:'critical',title:`${model.overdue.length} impayé(s) à relancer`,detail:`${euro(model.overdue.reduce((s,r)=>s+r.remaining,0))} de trésorerie bloquée`,href:'/invoices'});
    if(model.acceptedUnbilled.length) rows.push({kind:'critical',title:`${model.acceptedUnbilled.length} devis accepté(s) à facturer`,detail:`${euro(model.acceptedUnbilled.reduce((s,q)=>s+quoteTotal(q),0))} convertibles en factures`,href:'/quotes'});
    const risky=model.missionMargins.filter(r=>r.revenue>0&&r.rate<goals.marginRate);
    if(risky.length) rows.push({kind:'warning',title:`${risky.length} chantier(s) sous la marge cible`,detail:`Objectif ${goals.marginRate}% — contrôle des coûts conseillé`,href:'/profitability'});
    if(model.conversion<goals.conversionRate&&quotes.length>=3) rows.push({kind:'warning',title:'Conversion commerciale sous l’objectif',detail:`${model.conversion.toFixed(0)}% réalisé pour ${goals.conversionRate}% visé`,href:'/commercial-crm'});
    if(!rows.length) rows.push({kind:'good',title:'Aucune alerte majeure détectée',detail:'Le cycle commercial et les encaissements sont sous contrôle.',href:'/execution-suite'});
    return rows;
  },[model,goals,quotes.length]);

  function persistTasks(next:RevenueTask[]){setTasks(next);localStorage.setItem(TASK_KEY,JSON.stringify(next));}
  function addTask(input:Omit<RevenueTask,'id'|'done'|'created_at'>){const row:RevenueTask={...input,id:`rev-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,done:false,created_at:new Date().toISOString()};persistTasks([row,...tasks.filter(t=>!(t.entity_id===row.entity_id&&t.type===row.type&&!t.done))]);}
  function toggleTask(id:string){persistTasks(tasks.map(t=>t.id===id?{...t,done:!t.done}:t));}
  function saveGoals(next:Goals){setGoals(next);localStorage.setItem(GOAL_KEY,JSON.stringify(next));}
  function createInvoice(quoteId:string){try{convertQuoteToInvoice(quoteId,new Date(Date.now()+30*DAY).toISOString())}catch(err){alert(err instanceof Error?err.message:'Conversion impossible')}}
  function collectFull(invoiceId:string){const row=model.invoiceRows.find(r=>r.invoice.id===invoiceId);if(!row||row.remaining<=0)return;if(!confirm(`Enregistrer ${euro(row.remaining)} comme encaissé ?`))return;addInvoicePayment(invoiceId,{amount:row.remaining,method:'transfer',note:'Encaissement rapide Revenue Ops',paid_at:new Date().toISOString()});}
  function exportCsv(){
    const lines=[['Type','Référence','Client / Chantier','Montant','Statut','Échéance / Marge']];
    model.overdue.forEach(r=>lines.push(['Impayé',r.invoice.number,clientName(r.invoice.client_id),r.remaining.toFixed(2),`${r.overdueDays} jours de retard`,dateLabel(r.invoice.due_date)]));
    model.acceptedUnbilled.forEach(q=>lines.push(['Devis accepté',q.number,clientName(q.client_id),quoteTotal(q).toFixed(2),'À facturer','']));
    model.missionMargins.forEach(r=>lines.push(['Marge chantier',r.mission.title,r.mission.title,r.margin.toFixed(2),`${r.rate.toFixed(1)}%`,euro(r.revenue)]));
    const blob=new Blob([lines.map(row=>row.map(csvCell).join(';')).join('\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`closerflow-revenue-ops-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  }
  function clientName(id:string|null){const c=clients.find(x=>x.id===id);return c?(c.company_name||`${c.first_name} ${c.last_name}`.trim()):'Client non renseigné'}

  return <div className="revenue-ops-page">
    <div className="page-title revenue-heading"><div><p className="eyebrow">CROISSANCE & TRÉSORERIE</p><h1>Revenue Ops v13.5</h1><p>Transformer les devis en chiffre d’affaires, accélérer les encaissements et protéger la marge.</p></div><div className={`revenue-score ${scores.global<60?'danger':''}`}><Gauge/><strong>{scores.global}</strong><span>/100</span></div></div>

    <section className="revenue-kpis">
      <article><BadgeEuro/><div><strong>{euro(model.billedMonth)}</strong><span>Facturé ce mois</span></div><progress max="100" value={scores.revenue}/></article>
      <article><HandCoins/><div><strong>{euro(model.collectedMonth)}</strong><span>Encaissé ce mois</span></div><progress max="100" value={scores.collections}/></article>
      <article className={model.receivable>0?'warning':''}><WalletCards/><div><strong>{euro(model.receivable)}</strong><span>À encaisser</span></div></article>
      <article><Target/><div><strong>{model.conversion.toFixed(0)}%</strong><span>Conversion devis</span></div><progress max="100" value={scores.conversion}/></article>
      <article className={model.marginRate<goals.marginRate?'warning':''}><TrendingUp/><div><strong>{model.marginRate.toFixed(1)}%</strong><span>Marge chantier</span></div><progress max="100" value={scores.margin}/></article>
    </section>

    <div className="revenue-tabs">
      <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><BarChart3/>Vue d’ensemble</button>
      <button className={tab==='collections'?'active':''} onClick={()=>setTab('collections')}><Banknote/>Encaissements</button>
      <button className={tab==='sales'?'active':''} onClick={()=>setTab('sales')}><BriefcaseBusiness/>Commercial</button>
      <button className={tab==='margin'?'active':''} onClick={()=>setTab('margin')}><ShieldCheck/>Marge</button>
      <button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}><ClipboardList/>Actions</button>
    </div>

    {tab==='overview'&&<div className="revenue-grid">
      <section className="card"><header className="section-header"><div><h2>Objectifs du mois</h2><p>Pilotage local, modifiable à tout moment.</p></div><Target/></header><div className="revenue-goals">
        <label>CA facturé<input type="number" value={goals.monthlyRevenue} onChange={e=>saveGoals({...goals,monthlyRevenue:Number(e.target.value)||0})}/></label>
        <label>Encaissements<input type="number" value={goals.monthlyCollections} onChange={e=>saveGoals({...goals,monthlyCollections:Number(e.target.value)||0})}/></label>
        <label>Conversion devis %<input type="number" value={goals.conversionRate} onChange={e=>saveGoals({...goals,conversionRate:Number(e.target.value)||0})}/></label>
        <label>Marge cible %<input type="number" value={goals.marginRate} onChange={e=>saveGoals({...goals,marginRate:Number(e.target.value)||0})}/></label>
      </div></section>
      <section className="card"><header className="section-header"><div><h2>Plan d’action automatique</h2><p>Les priorités calculées à partir des données réelles.</p></div><Sparkles/></header><div className="revenue-recommendations">{recommendations.map((r,i)=><Link to={r.href} key={`${r.title}-${i}`} className={r.kind}><span>{r.kind==='critical'?<AlertTriangle/>:r.kind==='warning'?<FileWarning/>:<CheckCircle2/>}</span><div><strong>{r.title}</strong><small>{r.detail}</small></div><ArrowRight/></Link>)}</div></section>
      <section className="card revenue-aging"><header className="section-header"><div><h2>Âge des créances</h2><p>Répartition des sommes restant à encaisser.</p></div><CircleDollarSign/></header>{[
        ['À échéance',model.buckets.current],['1–30 jours',model.buckets.d1_30],['31–60 jours',model.buckets.d31_60],['61–90 jours',model.buckets.d61_90],['+90 jours',model.buckets.d90plus]
      ].map(([label,value])=><div className="aging-row" key={String(label)}><span>{label}</span><div><i style={{width:`${model.receivable?Math.max(2,Number(value)/model.receivable*100):0}%`}}/></div><b>{euro(Number(value))}</b></div>)}</section>
      <section className="card"><header className="section-header"><div><h2>Top clients</h2><p>Valeur facturée et encours.</p></div><UsersRound/></header><div className="revenue-client-list">{model.clientStats.slice(0,6).map(row=><article key={row.client.id}><div><strong>{row.client.company_name||`${row.client.first_name} ${row.client.last_name}`}</strong><small>{row.won}/{row.quotes} devis gagnés</small></div><div><b>{euro(row.revenue)}</b><small>{row.outstanding?`${euro(row.outstanding)} restant`:'À jour'}</small></div></article>)}</div></section>
    </div>}

    {tab==='collections'&&<div className="revenue-grid">
      <section className="card revenue-wide"><header className="section-header"><div><h2>Créances prioritaires</h2><p>Les plus anciennes apparaissent en premier.</p></div><button className="secondary" onClick={exportCsv}><Download/> Export CSV</button></header><div className="collection-list">{model.overdue.length?model.overdue.map(row=><article key={row.invoice.id}><div className="collection-days"><b>{row.overdueDays}</b><span>jours</span></div><div><strong>{row.invoice.number} — {row.invoice.title}</strong><small>{clientName(row.invoice.client_id)} · échéance {dateLabel(row.invoice.due_date)}</small></div><div className="collection-amount"><b>{euro(row.remaining)}</b><small>sur {euro(row.total)}</small></div><div className="row-actions"><button className="secondary" onClick={()=>addTask({type:'collection',title:`Relancer ${row.invoice.number}`,detail:`${clientName(row.invoice.client_id)} · ${euro(row.remaining)}`,due_at:new Date().toISOString(),entity_id:row.invoice.id})}><MessageSquareText/>Relance</button><button className="primary" onClick={()=>collectFull(row.invoice.id)}><HandCoins/>Encaissé</button></div></article>):<div className="empty-state compact"><CheckCircle2/><p>Aucun impayé détecté.</p></div>}</div></section>
    </div>}

    {tab==='sales'&&<div className="revenue-grid">
      <section className="card"><header className="section-header"><div><h2>Pipeline commercial</h2><p>{euro(model.pipeline)} de potentiel ouvert.</p></div><BriefcaseBusiness/></header><div className="sales-stage-grid"><article><span>Brouillons / envoyés</span><strong>{model.quotesOpen.length}</strong><b>{euro(model.quotesOpen.reduce((s,q)=>s+quoteTotal(q),0))}</b></article><article><span>Acceptés non facturés</span><strong>{model.acceptedUnbilled.length}</strong><b>{euro(model.acceptedUnbilled.reduce((s,q)=>s+quoteTotal(q),0))}</b></article><article><span>Conversion</span><strong>{model.conversion.toFixed(0)}%</strong><b>Objectif {goals.conversionRate}%</b></article></div></section>
      <section className="card revenue-wide"><header className="section-header"><div><h2>Devis à transformer</h2><p>Priorité aux devis acceptés, puis aux devis envoyés.</p></div><FileCheck2/></header><div className="sales-list">{[...model.acceptedUnbilled,...model.quotesOpen].slice(0,15).map(q=><article key={q.id}><div><strong>{q.number} — {q.title}</strong><small>{clientName(q.client_id)} · {q.status==='accepted'?'Accepté':q.status==='sent'?'Envoyé':'Brouillon'}</small></div><b>{euro(quoteTotal(q))}</b><div className="row-actions">{q.status==='accepted'?<button className="primary" onClick={()=>createInvoice(q.id)}><ReceiptText/>Facturer</button>:<><button className="secondary" onClick={()=>updateQuoteStatus(q.id,'sent')}><RefreshCcw/>Marquer envoyé</button><button className="secondary" onClick={()=>addTask({type:'quote',title:`Relancer ${q.number}`,detail:`${clientName(q.client_id)} · ${euro(quoteTotal(q))}`,due_at:new Date(Date.now()+2*DAY).toISOString(),entity_id:q.id})}><CalendarClock/>Planifier relance</button></>}</div></article>)}</div></section>
    </div>}

    {tab==='margin'&&<div className="revenue-grid">
      <section className="card"><header className="section-header"><div><h2>Protection de marge</h2><p>Rentabilité calculée sur les recettes, heures et dépenses disponibles.</p></div><ShieldCheck/></header><div className="margin-summary"><article><span>CA HT suivi</span><strong>{euro(model.totalRevenue)}</strong></article><article><span>Marge estimée</span><strong className={model.totalMargin<0?'negative':''}>{euro(model.totalMargin)}</strong></article><article><span>Taux global</span><strong className={model.marginRate<goals.marginRate?'negative':''}>{model.marginRate.toFixed(1)}%</strong></article></div></section>
      <section className="card revenue-wide"><header className="section-header"><div><h2>Chantiers à surveiller</h2><p>Les marges les plus faibles apparaissent en premier.</p></div><TrendingDown/></header><div className="margin-list">{model.missionMargins.slice(0,15).map(row=><article key={row.mission.id} className={row.rate<goals.marginRate?'risk':''}><div><strong>{row.mission.title}</strong><small>CA HT {euro(row.revenue)} · coût {euro(row.cost)} · main-d’œuvre {euro(row.labour)}</small></div><div><b>{euro(row.margin)}</b><span>{row.rate.toFixed(1)}%</span></div><div className="row-actions"><Link className="secondary" to={`/missions/${row.mission.id}`}>Ouvrir</Link>{row.mission.status==='completed'&&!invoices.some(i=>i.mission_id===row.mission.id)&&<button className="secondary" onClick={()=>addTask({type:'mission',title:`Facturer ${row.mission.title}`,detail:'Chantier terminé sans facture',due_at:new Date().toISOString(),entity_id:row.mission.id})}>Créer action</button>}{row.mission.status==='in_progress'&&<button className="secondary" onClick={()=>updateMissionStatus(row.mission.id,'completed')}>Terminer</button>}</div></article>)}</div></section>
    </div>}

    {tab==='tasks'&&<div className="revenue-grid">
      <section className="card revenue-wide"><header className="section-header"><div><h2>Actions commerciales & trésorerie</h2><p>{tasks.filter(t=>!t.done).length} action(s) encore ouvertes.</p></div><ClipboardList/></header><div className="revenue-task-list">{tasks.length?tasks.sort((a,b)=>Number(a.done)-Number(b.done)||new Date(a.due_at).getTime()-new Date(b.due_at).getTime()).map(task=><article key={task.id} className={task.done?'done':''}><button onClick={()=>toggleTask(task.id)}>{task.done?<CheckCircle2/>:<ClipboardList/>}</button><div><strong>{task.title}</strong><small>{task.detail} · échéance {dateLabel(task.due_at)}</small></div><span>{task.type==='collection'?'Encaissement':task.type==='quote'?'Devis':task.type==='mission'?'Chantier':'Client'}</span></article>):<div className="empty-state compact"><CheckCircle2/><p>Aucune action enregistrée.</p></div>}</div></section>
    </div>}
  </div>;
}
