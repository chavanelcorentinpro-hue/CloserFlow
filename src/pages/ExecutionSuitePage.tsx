import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BadgeEuro, Banknote, CalendarDays, CheckCircle2, CircleDollarSign,
  ClipboardCheck, Clock3, FileCheck2, FileWarning, Gauge, HardHat, ListChecks,
  PackageSearch, ReceiptText, RefreshCcw, ShieldCheck, Sparkles, TimerReset,
  TrendingUp, UserCheck, Users, WalletCards, Wrench
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const DAY_MS = 86_400_000;
const euro = (value:number) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(value)?value:0);
const isoDay = (value:string|Date|null|undefined) => value ? new Date(value).toISOString().slice(0,10) : '';
const invoiceTotal = (invoice:any) => {
  const ht=(invoice.lines||[]).reduce((sum:number,line:any)=>sum+(Number(line.quantity)||0)*(Number(line.unit_price_ht)||0),0)*(1-(Number(invoice.discount_percent)||0)/100);
  return ht*(1+(Number(invoice.vat_rate)||0)/100);
};
const quoteTotal = (quote:any) => (quote.lines||[]).reduce((sum:number,line:any)=>sum+(Number(line.quantity)||0)*(Number(line.unit_price_ht)||0),0)*(1-(Number(quote.discount_percent)||0)/100);
const durationHours=(start:string,end:string|null)=>Math.max(0,((end?new Date(end).getTime():Date.now())-new Date(start).getTime())/3_600_000);

type Tab='finance'|'chantier'|'team'|'audit';
type ChecklistState=Record<string,boolean>;
const CHECK_KEY='closerflow.execution-suite.checks.v13.4';
function readChecks():ChecklistState{try{return JSON.parse(localStorage.getItem(CHECK_KEY)||'{}')}catch{return {}}}

export function ExecutionSuitePage(){
  const {
    clients,missions,quotes,invoices,team,inventory,timeEntries,businessExpenses,
    updateInvoiceStatus,convertQuoteToInvoice,assignMission,updateMissionStatus,stopTimer
  }=useAppData();
  const [tab,setTab]=useState<Tab>('finance');
  const [checks,setChecks]=useState<ChecklistState>(readChecks);
  const now=Date.now();
  const today=isoDay(new Date());

  const finance=useMemo(()=>{
    const invoiceRows=invoices.map(invoice=>{
      const total=invoiceTotal(invoice);
      const paid=(invoice.payments||[]).reduce((sum,p)=>sum+(Number(p.amount)||0),0);
      return {invoice,total,paid,remaining:Math.max(0,total-paid)};
    });
    const receivable=invoiceRows.reduce((s,r)=>s+r.remaining,0);
    const overdue=invoiceRows.filter(r=>r.remaining>0 && (r.invoice.status==='overdue'||(r.invoice.due_date&&new Date(r.invoice.due_date).getTime()<now)));
    const overdueAmount=overdue.reduce((s,r)=>s+r.remaining,0);
    const accepted=quotes.filter(q=>q.status==='accepted'&&!invoices.some(i=>i.quote_id===q.id));
    const sent=quotes.filter(q=>q.status==='sent');
    const month=new Date().toISOString().slice(0,7);
    const billed=invoices.filter(i=>i.created_at.startsWith(month)).reduce((s,i)=>s+invoiceTotal(i),0);
    const paidMonth=invoiceRows.filter(r=>(r.invoice.payments||[]).some(p=>p.paid_at.startsWith(month))).reduce((s,r)=>s+(r.invoice.payments||[]).filter(p=>p.paid_at.startsWith(month)).reduce((a,p)=>a+p.amount,0),0);
    const expenses=businessExpenses.filter(e=>e.expense_date.startsWith(month)).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);
    return {invoiceRows,receivable,overdue,overdueAmount,accepted,sent,billed,paidMonth,expenses,net:paidMonth-expenses};
  },[invoices,quotes,businessExpenses,now]);

  const ops=useMemo(()=>{
    const active=missions.filter(m=>['accepted','planned','in_progress'].includes(m.status));
    const unassigned=active.filter(m=>!m.assigned_user_id);
    const unscheduled=active.filter(m=>!m.scheduled_start||!m.scheduled_end);
    const completedUnbilled=missions.filter(m=>m.status==='completed'&&!invoices.some(i=>i.mission_id===m.id));
    const todayMissions=missions.filter(m=>m.scheduled_start&&isoDay(m.scheduled_start)===today).sort((a,b)=>new Date(a.scheduled_start!).getTime()-new Date(b.scheduled_start!).getTime());
    const openTasks=missions.flatMap(m=>(m.tasks||[]).filter(t=>!t.done).map(t=>({mission:m,task:t}))).slice(0,12);
    return {active,unassigned,unscheduled,completedUnbilled,todayMissions,openTasks};
  },[missions,invoices,today]);

  const workforce=useMemo(()=>{
    const activeMembers=team.filter(m=>m.active);
    const activeTimers=timeEntries.filter(t=>!t.ended_at);
    const hours=timeEntries.reduce((s,t)=>s+durationHours(t.started_at,t.ended_at),0);
    const labourCost=timeEntries.reduce((s,t)=>s+durationHours(t.started_at,t.ended_at)*(t.hourly_cost||0),0);
    const conflicts:any[]=[];
    for(const member of activeMembers){
      const rows=missions.filter(m=>m.assigned_user_id===member.id&&m.scheduled_start&&m.scheduled_end).sort((a,b)=>new Date(a.scheduled_start!).getTime()-new Date(b.scheduled_start!).getTime());
      for(let i=1;i<rows.length;i++){
        const prev=rows[i-1],cur=rows[i];
        if(new Date(cur.scheduled_start!).getTime()<new Date(prev.scheduled_end!).getTime()) conflicts.push({member,prev,cur});
      }
    }
    const todayLoad=activeMembers.map(member=>({member,missions:missions.filter(m=>m.assigned_user_id===member.id&&m.scheduled_start&&isoDay(m.scheduled_start)===today)}));
    return {activeMembers,activeTimers,hours,labourCost,conflicts,todayLoad};
  },[team,timeEntries,missions,today]);

  const audit=useMemo(()=>{
    const issues:{id:string;label:string;detail:string;href:string;severity:'critical'|'warning'}[]=[];
    if(finance.overdue.length)issues.push({id:'overdue',label:`${finance.overdue.length} facture(s) en retard`,detail:`${euro(finance.overdueAmount)} à encaisser`,href:'/invoices',severity:'critical'});
    if(finance.accepted.length)issues.push({id:'accepted',label:`${finance.accepted.length} devis accepté(s) non facturé(s)`,detail:'Conversion en facture à faire',href:'/quotes',severity:'critical'});
    if(ops.completedUnbilled.length)issues.push({id:'completed',label:`${ops.completedUnbilled.length} chantier(s) terminé(s) sans facture`,detail:'Risque de chiffre d’affaires oublié',href:'/missions',severity:'critical'});
    if(ops.unassigned.length)issues.push({id:'unassigned',label:`${ops.unassigned.length} chantier(s) sans responsable`,detail:'Affectation équipe manquante',href:'/missions',severity:'warning'});
    if(ops.unscheduled.length)issues.push({id:'unscheduled',label:`${ops.unscheduled.length} chantier(s) sans planning complet`,detail:'Dates début/fin manquantes',href:'/planning',severity:'warning'});
    if(workforce.conflicts.length)issues.push({id:'conflicts',label:`${workforce.conflicts.length} conflit(s) de planning`,detail:'Deux interventions se chevauchent pour un collaborateur',href:'/smart-planning',severity:'critical'});
    const low=inventory.filter(i=>i.quantity<=i.minimum_quantity);
    if(low.length)issues.push({id:'stock',label:`${low.length} article(s) sous le seuil`,detail:'Réapprovisionnement conseillé',href:'/inventory',severity:'warning'});
    const noContact=clients.filter(c=>!c.phone&&!c.email);
    if(noContact.length)issues.push({id:'contact',label:`${noContact.length} client(s) sans contact`,detail:'Téléphone et e-mail absents',href:'/clients',severity:'warning'});
    const score=Math.max(0,100-issues.reduce((s,i)=>s+(i.severity==='critical'?12:5),0));
    return {issues,score,low,noContact};
  },[finance.overdue.length,finance.overdueAmount,finance.accepted.length,ops.completedUnbilled.length,ops.unassigned.length,ops.unscheduled.length,workforce.conflicts.length,inventory,clients]);

  function toggleCheck(id:string){const next={...checks,[id]:!checks[id]};setChecks(next);localStorage.setItem(CHECK_KEY,JSON.stringify(next));}
  function makeInvoice(quoteId:string){try{convertQuoteToInvoice(quoteId,new Date(Date.now()+30*DAY_MS).toISOString())}catch(err){alert(err instanceof Error?err.message:'Conversion impossible')}}
  function autoAssign(missionId:string){const mission=missions.find(m=>m.id===missionId);if(!mission)return;const available=workforce.activeMembers.sort((a,b)=>missions.filter(m=>m.assigned_user_id===a.id&&['planned','in_progress'].includes(m.status)).length-missions.filter(m=>m.assigned_user_id===b.id&&['planned','in_progress'].includes(m.status)).length)[0];if(available)assignMission(missionId,available.id)}

  return <div className="execution-suite-page">
    <div className="page-title execution-heading"><div><p className="eyebrow">EXÉCUTION</p><h1>CloserFlow 13.4</h1><p>Finance, chantiers, équipe et contrôle dans un seul centre opérationnel.</p></div><Gauge/></div>

    <section className="execution-kpis">
      <article><CircleDollarSign/><div><strong>{euro(finance.receivable)}</strong><span>À encaisser</span></div></article>
      <article className={finance.overdue.length?'danger':''}><FileWarning/><div><strong>{euro(finance.overdueAmount)}</strong><span>En retard</span></div></article>
      <article><HardHat/><div><strong>{ops.active.length}</strong><span>Chantiers actifs</span></div></article>
      <article><Users/><div><strong>{workforce.activeMembers.length}</strong><span>Équipe active</span></div></article>
      <article className={audit.score<70?'danger':''}><ShieldCheck/><div><strong>{audit.score}/100</strong><span>Qualité opérationnelle</span></div></article>
    </section>

    <div className="execution-tabs">
      <button className={tab==='finance'?'active':''} onClick={()=>setTab('finance')}><BadgeEuro/>Finance</button>
      <button className={tab==='chantier'?'active':''} onClick={()=>setTab('chantier')}><Wrench/>Chantiers</button>
      <button className={tab==='team'?'active':''} onClick={()=>setTab('team')}><Users/>Équipe</button>
      <button className={tab==='audit'?'active':''} onClick={()=>setTab('audit')}><ShieldCheck/>Contrôle</button>
    </div>

    {tab==='finance'&&<div className="execution-grid">
      <section className="card execution-main"><header><div><h2>Encaissement & facturation</h2><p>Ce qui doit rentrer ou être facturé maintenant.</p></div><Link className="secondary-button" to="/invoices">Toutes les factures</Link></header>
        <div className="execution-stat-strip"><p><span>Facturé ce mois</span><strong>{euro(finance.billed)}</strong></p><p><span>Encaissé ce mois</span><strong>{euro(finance.paidMonth)}</strong></p><p><span>Dépenses ce mois</span><strong>{euro(finance.expenses)}</strong></p><p><span>Solde opérationnel</span><strong>{euro(finance.net)}</strong></p></div>
        <h3>Factures prioritaires</h3><div className="execution-list">{finance.overdue.length?finance.overdue.slice(0,10).map(({invoice,remaining})=><article key={invoice.id}><div><strong>{invoice.number} · {invoice.title}</strong><small>Échéance {invoice.due_date?new Date(invoice.due_date).toLocaleDateString('fr-FR'):'non définie'} · {euro(remaining)} restant</small></div><div className="execution-row-actions"><Link to={`/invoices/${invoice.id}`}>Ouvrir</Link><button onClick={()=>updateInvoiceStatus(invoice.id,'paid')}>Marquer payée</button></div></article>):<div className="empty-state"><CheckCircle2/><p>Aucun impayé détecté.</p></div>}</div>
      </section>
      <section className="card"><h2>Devis à transformer</h2><p className="muted">Acceptés mais sans facture liée.</p><div className="execution-list compact">{finance.accepted.length?finance.accepted.map(q=><article key={q.id}><div><strong>{q.number}</strong><small>{q.title} · {euro(quoteTotal(q))}</small></div><button onClick={()=>makeInvoice(q.id)}>Créer facture</button></article>):<p className="muted">Aucun devis en attente.</p>}</div></section>
    </div>}

    {tab==='chantier'&&<div className="execution-grid">
      <section className="card execution-main"><header><div><h2>Exécution chantier</h2><p>Planning du jour et dossiers qui bloquent.</p></div><Link className="secondary-button" to="/missions">Voir les chantiers</Link></header>
        <h3>Aujourd’hui</h3><div className="execution-list">{ops.todayMissions.length?ops.todayMissions.map(m=><article key={m.id}><div><strong>{m.title}</strong><small>{m.scheduled_start?new Date(m.scheduled_start).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''} · {team.find(t=>t.id===m.assigned_user_id)?.name||'Non affecté'}</small></div><div className="execution-row-actions"><Link to={`/missions/${m.id}`}>Ouvrir</Link>{m.status!=='in_progress'&&<button onClick={()=>updateMissionStatus(m.id,'in_progress')}>Démarrer</button>}</div></article>):<p className="muted">Aucune mission planifiée aujourd’hui.</p>}</div>
        <h3>À corriger</h3><div className="execution-list">{ops.unassigned.slice(0,8).map(m=><article key={m.id}><div><strong>{m.title}</strong><small>Aucun responsable affecté</small></div><button onClick={()=>autoAssign(m.id)} disabled={!workforce.activeMembers.length}>Affecter auto</button></article>)}{!ops.unassigned.length&&<p className="muted">Toutes les missions actives sont affectées.</p>}</div>
      </section>
      <section className="card"><h2>Tâches ouvertes</h2><div className="execution-checklist">{ops.openTasks.length?ops.openTasks.map(({mission,task})=><Link key={task.id} to={`/missions/${mission.id}`}><ClipboardCheck/><div><strong>{task.label}</strong><small>{mission.title}</small></div></Link>):<p className="muted">Aucune tâche ouverte.</p>}</div></section>
    </div>}

    {tab==='team'&&<div className="execution-grid">
      <section className="card execution-main"><header><div><h2>Équipe & charge</h2><p>Pointages, conflits et répartition du jour.</p></div><Link className="secondary-button" to="/team">Gérer l’équipe</Link></header>
        <div className="execution-stat-strip"><p><span>Heures enregistrées</span><strong>{workforce.hours.toFixed(1)} h</strong></p><p><span>Coût main-d’œuvre</span><strong>{euro(workforce.labourCost)}</strong></p><p><span>Pointages actifs</span><strong>{workforce.activeTimers.length}</strong></p><p><span>Conflits</span><strong>{workforce.conflicts.length}</strong></p></div>
        <h3>Charge aujourd’hui</h3><div className="execution-team-grid">{workforce.todayLoad.map(({member,missions:rows})=><article key={member.id}><div className="execution-avatar">{member.name.slice(0,1).toUpperCase()}</div><div><strong>{member.name}</strong><small>{rows.length} intervention(s) aujourd’hui</small></div><span>{rows.length}</span></article>)}</div>
        <h3>Chronomètres actifs</h3><div className="execution-list compact">{workforce.activeTimers.length?workforce.activeTimers.map(t=><article key={t.id}><div><strong>{team.find(m=>m.id===t.user_id)?.name||'Collaborateur'}</strong><small>{missions.find(m=>m.id===t.mission_id)?.title||'Mission'} · {durationHours(t.started_at,null).toFixed(1)} h</small></div><button onClick={()=>stopTimer(t.id)}><TimerReset/> Arrêter</button></article>):<p className="muted">Aucun chronomètre actif.</p>}</div>
      </section>
      <section className="card"><h2>Conflits planning</h2><div className="execution-list compact">{workforce.conflicts.length?workforce.conflicts.slice(0,10).map((c,i)=><article key={`${c.member.id}-${i}`}><div><strong>{c.member.name}</strong><small>{c.prev.title} chevauche {c.cur.title}</small></div><Link to="/smart-planning">Corriger</Link></article>):<div className="empty-state"><CheckCircle2/><p>Aucun chevauchement détecté.</p></div>}</div></section>
    </div>}

    {tab==='audit'&&<div className="execution-grid">
      <section className="card execution-main"><header><div><h2>Contrôle avant clôture</h2><p>Les anomalies les plus risquées sont remontées automatiquement.</p></div><span className={`execution-score ${audit.score<70?'bad':audit.score<90?'warn':'good'}`}>{audit.score}/100</span></header>
        <div className="execution-audit-list">{audit.issues.length?audit.issues.map(issue=><article key={issue.id} className={issue.severity}><AlertTriangle/><div><strong>{issue.label}</strong><small>{issue.detail}</small></div><Link to={issue.href}>Traiter</Link></article>):<div className="empty-state"><CheckCircle2/><p>Aucune anomalie critique détectée.</p></div>}</div>
      </section>
      <section className="card"><h2>Checklist dirigeant</h2><p className="muted">Persistante sur l’appareil.</p><div className="execution-manual-checks">{[
        ['bank','Rapprochement bancaire vérifié'],['quotes','Devis importants relancés'],['cash','Encaissements du jour contrôlés'],['crew','Planning équipe confirmé'],['stock','Achats urgents commandés'],['backup','Sauvegarde récente vérifiée']
      ].map(([id,label])=><label key={id}><input type="checkbox" checked={!!checks[id]} onChange={()=>toggleCheck(id)}/><span>{label}</span></label>)}</div></section>
    </div>}
  </div>;
}
