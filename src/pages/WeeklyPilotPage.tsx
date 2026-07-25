import { useMemo, useState } from 'react';
import { endOfWeek, format, isWithinInterval, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Banknote, CalendarCheck2, CheckCircle2, Download, Flag, RotateCcw, Target, TimerReset, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const GOALS_KEY='closerflow.weekly.goals.v12.3';
const DONE_KEY='closerflow.weekly.done.v12.3';

type Goals={revenue:number;collections:number;hours:number};
type Action={id:string;title:string;detail:string;href:string;category:'finance'|'sales'|'planning'|'operations';priority:number};

function loadGoals():Goals{try{return {...{revenue:5000,collections:3500,hours:35},...JSON.parse(localStorage.getItem(GOALS_KEY)??'{}')}}catch{return {revenue:5000,collections:3500,hours:35}}}
function loadDone():string[]{try{return JSON.parse(localStorage.getItem(DONE_KEY)??'[]')}catch{return []}}
function totalInvoice(invoice:{lines:{quantity:number;unit_price_ht:number}[];discount_percent:number;vat_rate:number}){const ht=invoice.lines.reduce((sum,line)=>sum+line.quantity*line.unit_price_ht,0)*(1-(invoice.discount_percent??0)/100);return ht*(1+invoice.vat_rate/100)}
function euro(value:number){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value)}
function csvCell(value:string|number){return `"${String(value).replaceAll('"','""')}"`}
function downloadCsv(filename:string,rows:(string|number)[][]){const content='\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url)}

export function WeeklyPilotPage(){
 const {missions,quotes,invoices,inventory,timeEntries,team}=useAppData();
 const [goals,setGoals]=useState<Goals>(loadGoals);
 const [done,setDone]=useState<string[]>(loadDone);
 const weekStart=startOfWeek(new Date(),{weekStartsOn:1});const weekEnd=endOfWeek(new Date(),{weekStartsOn:1});
 const inWeek=(value:string|null|undefined)=>!!value&&isWithinInterval(new Date(value),{start:weekStart,end:weekEnd});

 const metrics=useMemo(()=>{
   const billed=invoices.filter(invoice=>inWeek(invoice.created_at)).reduce((sum,invoice)=>sum+totalInvoice(invoice),0);
   const collected=invoices.reduce((sum,invoice)=>sum+(invoice.payments??[]).filter(payment=>inWeek(payment.paid_at)).reduce((inner,payment)=>inner+payment.amount,0),0);
   const hours=timeEntries.filter(entry=>entry.ended_at&&inWeek(entry.ended_at)).reduce((sum,entry)=>sum+Math.max(0,(new Date(entry.ended_at!).getTime()-new Date(entry.started_at).getTime())/3600000),0);
   const planned=missions.filter(mission=>inWeek(mission.scheduled_start)).length;
   return {billed,collected,hours,planned};
 },[invoices,missions,timeEntries]);

 const actions=useMemo<Action[]>(()=>{
   const rows:Action[]=[];const now=Date.now();
   invoices.filter(invoice=>invoice.status==='overdue'||(invoice.due_date&&new Date(invoice.due_date).getTime()<now&&!['paid'].includes(invoice.status))).forEach(invoice=>{const paid=(invoice.payments??[]).reduce((sum,p)=>sum+p.amount,0);rows.push({id:`invoice-${invoice.id}`,title:`Relancer ${invoice.number}`,detail:`${euro(Math.max(0,totalInvoice(invoice)-paid))} restant à encaisser`,href:`/invoices/${invoice.id}`,category:'finance',priority:100})});
   quotes.filter(quote=>quote.status==='sent'&&now-new Date(quote.created_at).getTime()>7*86400000).forEach(quote=>rows.push({id:`quote-${quote.id}`,title:`Relancer ${quote.number}`,detail:quote.title,href:`/quotes/${quote.id}`,category:'sales',priority:80}));
   missions.filter(mission=>['accepted','planned','in_progress'].includes(mission.status)&&(!mission.scheduled_start||!mission.scheduled_end)).forEach(mission=>rows.push({id:`schedule-${mission.id}`,title:'Planifier le chantier',detail:mission.title,href:`/missions/${mission.id}`,category:'planning',priority:70}));
   missions.filter(mission=>inWeek(mission.scheduled_start)&&!mission.assigned_user_id).forEach(mission=>rows.push({id:`assign-${mission.id}`,title:'Affecter un responsable',detail:mission.title,href:`/missions/${mission.id}`,category:'planning',priority:75}));
   inventory.filter(item=>item.quantity<=item.minimum_quantity).forEach(item=>rows.push({id:`stock-${item.id}`,title:'Réapprovisionner le stock',detail:`${item.name} : ${item.quantity} ${item.unit} disponibles`,href:'/inventory',category:'operations',priority:60}));
   timeEntries.filter(entry=>!entry.ended_at).forEach(entry=>{const person=team.find(member=>member.id===entry.user_id)?.name??'Collaborateur';rows.push({id:`timer-${entry.id}`,title:'Arrêter un chronomètre actif',detail:person,href:'/time-tracking',category:'operations',priority:90})});
   return rows.sort((a,b)=>b.priority-a.priority);
 },[inventory,invoices,missions,quotes,team,timeEntries]);
 const remaining=actions.filter(action=>!done.includes(action.id));

 function saveGoals(next:Goals){setGoals(next);localStorage.setItem(GOALS_KEY,JSON.stringify(next))}
 function toggleDone(id:string){const next=done.includes(id)?done.filter(value=>value!==id):[...done,id];setDone(next);localStorage.setItem(DONE_KEY,JSON.stringify(next))}
 function resetWeek(){setDone([]);localStorage.removeItem(DONE_KEY)}
 function exportPlan(){downloadCsv(`plan-semaine-${format(weekStart,'yyyy-MM-dd')}.csv`,[['Priorité','Catégorie','Action','Détail','Statut'],...actions.map(action=>[action.priority,action.category,action.title,action.detail,done.includes(action.id)?'Traité':'À faire'])])}
 const progress=(value:number,target:number)=>Math.min(100,Math.round(value/Math.max(1,target)*100));

 return <div className="weekly-page">
  <div className="page-title weekly-heading"><div><p className="eyebrow">PILOTAGE HEBDOMADAIRE — V12.3</p><h1>Ma semaine</h1><p>Du {format(weekStart,'dd MMMM',{locale:fr})} au {format(weekEnd,'dd MMMM yyyy',{locale:fr})}</p></div><CalendarCheck2/></div>
  <section className="weekly-kpis">
   <article><Banknote/><div><strong>{euro(metrics.billed)}</strong><span>Facturé cette semaine</span><progress max="100" value={progress(metrics.billed,goals.revenue)}/><small>{progress(metrics.billed,goals.revenue)} % de l’objectif</small></div></article>
   <article><TrendingUp/><div><strong>{euro(metrics.collected)}</strong><span>Encaissé cette semaine</span><progress max="100" value={progress(metrics.collected,goals.collections)}/><small>{progress(metrics.collected,goals.collections)} % de l’objectif</small></div></article>
   <article><TimerReset/><div><strong>{metrics.hours.toFixed(1)} h</strong><span>Heures terminées</span><progress max="100" value={progress(metrics.hours,goals.hours)}/><small>{progress(metrics.hours,goals.hours)} % de l’objectif</small></div></article>
   <article><Flag/><div><strong>{metrics.planned}</strong><span>Chantiers prévus</span><strong className="weekly-action-count">{remaining.length} actions restantes</strong></div></article>
  </section>

  <div className="weekly-grid">
   <section className="card weekly-goals"><header><div><h2>Objectifs de la semaine</h2><p>Ils sont enregistrés sur cet appareil.</p></div><Target/></header><div className="form-grid">
    <label>Facturation cible (€)<input type="number" min="0" value={goals.revenue} onChange={event=>saveGoals({...goals,revenue:Number(event.target.value)})}/></label>
    <label>Encaissements cibles (€)<input type="number" min="0" value={goals.collections} onChange={event=>saveGoals({...goals,collections:Number(event.target.value)})}/></label>
    <label>Heures cibles<input type="number" min="1" max="100" value={goals.hours} onChange={event=>saveGoals({...goals,hours:Number(event.target.value)})}/></label>
   </div></section>
   <section className="card weekly-summary"><h2>Résumé exécution</h2><p><span>Actions détectées</span><strong>{actions.length}</strong></p><p><span>Actions traitées</span><strong>{done.length}</strong></p><p><span>Taux d’exécution</span><strong>{actions.length?Math.round(done.filter(id=>actions.some(a=>a.id===id)).length/actions.length*100):100} %</strong></p></section>
  </div>

  <section className="card weekly-actions"><header><div><h2>Plan d’action priorisé</h2><p>Les urgences financières et opérationnelles remontent en premier.</p></div><div><button className="secondary-button" onClick={resetWeek}><RotateCcw/>Réinitialiser</button><button className="secondary-button" onClick={exportPlan}><Download/>Exporter CSV</button></div></header>
   <div className="weekly-action-list">{actions.map(action=><article key={action.id} className={done.includes(action.id)?'done':''}><button className="weekly-check" aria-label={done.includes(action.id)?'Rouvrir':'Marquer comme traité'} onClick={()=>toggleDone(action.id)}><CheckCircle2/></button><Link to={action.href}><div><strong>{action.title}</strong><small>{action.detail}</small></div><span>{action.category}</span></Link></article>)}{!actions.length&&<div className="empty-state">Aucune action urgente détectée. La semaine est sous contrôle.</div>}</div>
  </section>
 </div>
}
