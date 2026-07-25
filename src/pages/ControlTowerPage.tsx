import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Banknote, BarChart3, CalendarDays, CheckCircle2, CircleDollarSign,
  ClipboardList, Download, Gauge, HardHat, LineChart, RefreshCw, ShieldAlert, Sparkles, Target,
  TrendingDown, TrendingUp, UserRoundCheck, UsersRound, WalletCards, Wrench
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { Mission } from '../types/domain';

const DAY=86400000;
const SETTINGS_KEY='closerflow.controlTower.settings.v13_6';
const ACTIONS_KEY='closerflow.controlTower.actions.v13_6';

type Scenario='stress'|'base'|'optimistic';
type Tab='forecast'|'projects'|'capacity'|'clients'|'actions';
interface Settings { cashFloor:number; marginTarget:number; capacityHours:number; quoteWinRate:number; }
interface TowerAction { id:string; title:string; detail:string; href:string; severity:'critical'|'warning'|'info'; done:boolean; created_at:string; }
interface ProjectBudget { mission_id:string; revenue:number; labour:number; expenses:number; margin:number; marginRate:number; budget:number; variance:number; risk:'high'|'medium'|'low'; }

const defaults:Settings={cashFloor:5000,marginTarget:30,capacityHours:35,quoteWinRate:45};
function readSettings(){try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return defaults}}
function readActions():TowerAction[]{try{return JSON.parse(localStorage.getItem(ACTIONS_KEY)||'[]')}catch{return []}}
const euro=(v:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(v)?v:0);
const pct=(v:number)=>`${(Number.isFinite(v)?v:0).toFixed(1)}%`;
const totalLines=(lines:{quantity:number;unit_price_ht:number}[],discount=0)=>lines.reduce((s,l)=>s+l.quantity*l.unit_price_ht,0)*(1-discount/100);
const invoiceHT=(i:any)=>totalLines(i.lines,i.discount_percent||0);
const invoiceTTC=(i:any)=>invoiceHT(i)*(1+(i.vat_rate||0)/100);
const quoteHT=(q:any)=>totalLines(q.lines,q.discount_percent||0);
const paid=(i:any)=>(i.payments||[]).reduce((s:number,p:any)=>s+p.amount,0);
const hoursBetween=(a:string,b:string|null)=>Math.max(0,(new Date(b||Date.now()).getTime()-new Date(a).getTime())/3600000);
const clientLabel=(c:any)=>c?(c.company_name||`${c.first_name||''} ${c.last_name||''}`.trim()||'Client'):'Client';

export function ControlTowerPage(){
  const data=useAppData();
  const {clients,missions,quotes,invoices,team,timeEntries,businessExpenses,maintenanceContracts,inventory}=data;
  const [tab,setTab]=useState<Tab>('forecast');
  const [scenario,setScenario]=useState<Scenario>('base');
  const [settings,setSettings]=useState<Settings>(readSettings);
  const [actions,setActions]=useState<TowerAction[]>(readActions);
  const now=Date.now();

  function saveSettings(next:Settings){setSettings(next);localStorage.setItem(SETTINGS_KEY,JSON.stringify(next))}
  function saveActions(next:TowerAction[]){setActions(next);localStorage.setItem(ACTIONS_KEY,JSON.stringify(next))}
  function addAction(input:Omit<TowerAction,'id'|'done'|'created_at'>){
    if(actions.some(a=>!a.done&&a.title===input.title))return;
    saveActions([{...input,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,done:false,created_at:new Date().toISOString()},...actions]);
  }
  function toggleAction(id:string){saveActions(actions.map(a=>a.id===id?{...a,done:!a.done}:a))}
  function clearDone(){saveActions(actions.filter(a=>!a.done))}

  const model=useMemo(()=>{
    const monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
    const openInvoices=invoices.map(i=>({invoice:i,total:invoiceTTC(i),paid:paid(i)})).map(x=>({...x,remaining:Math.max(0,x.total-x.paid)})).filter(x=>x.remaining>.01&&x.invoice.status!=='draft');
    const receivable=openInvoices.reduce((s,x)=>s+x.remaining,0);
    const overdue=openInvoices.filter(x=>x.invoice.due_date&&new Date(x.invoice.due_date).getTime()<now);
    const overdueAmount=overdue.reduce((s,x)=>s+x.remaining,0);
    const cashInMonth=invoices.flatMap(i=>(i.payments||[])).filter(p=>new Date(p.paid_at)>=monthStart).reduce((s,p)=>s+p.amount,0);
    const cashOutMonth=businessExpenses.filter(e=>e.paid&&new Date(e.expense_date)>=monthStart).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);
    const billedMonth=invoices.filter(i=>new Date(i.created_at)>=monthStart).reduce((s,i)=>s+invoiceTTC(i),0);
    const cashBalanceProxy=cashInMonth-cashOutMonth;

    const quoteOpen=quotes.filter(q=>q.status==='draft'||q.status==='sent');
    const quoteAccepted=quotes.filter(q=>q.status==='accepted');
    const quoteRejected=quotes.filter(q=>q.status==='rejected');
    const decided=quoteAccepted.length+quoteRejected.length;
    const conversion=decided?quoteAccepted.length/decided*100:0;
    const pipeline=quoteOpen.reduce((s,q)=>s+quoteHT(q)*(1+q.vat_rate/100),0);
    const acceptedUnbilled=quoteAccepted.filter(q=>!invoices.some(i=>i.quote_id===q.id));

    const projectBudgets:ProjectBudget[]=missions.map(m=>{
      const rev=invoices.filter(i=>i.mission_id===m.id).reduce((s,i)=>s+invoiceHT(i),0);
      const labour=timeEntries.filter(t=>t.mission_id===m.id).reduce((s,t)=>s+hoursBetween(t.started_at,t.ended_at)*t.hourly_cost,0);
      const expenses=businessExpenses.filter(e=>e.mission_id===m.id).reduce((s,e)=>s+e.amount_ht,0)+(m.expenses||[]).reduce((s,e)=>s+e.amount,0);
      const cost=labour+expenses;
      const margin=rev-cost;
      const rate=rev>0?margin/rev*100:0;
      const budget=Math.max(0,m.price_ht||0);
      const variance=rev-budget;
      const risk:ProjectBudget['risk']=rev>0&&rate<settings.marginTarget-10?'high':rev>0&&rate<settings.marginTarget?'medium':'low';
      return {mission_id:m.id,revenue:rev,labour,expenses,margin,marginRate:rate,budget,variance,risk};
    });
    const tracked=projectBudgets.filter(p=>p.revenue>0);
    const totalRevenue=tracked.reduce((s,p)=>s+p.revenue,0);
    const totalMargin=tracked.reduce((s,p)=>s+p.margin,0);
    const marginRate=totalRevenue?totalMargin/totalRevenue*100:0;

    const activeMembers=team.filter(t=>t.active);
    const horizon=Array.from({length:6},(_,idx)=>{
      const start=new Date();start.setDate(start.getDate()+idx*7-start.getDay()+1);start.setHours(0,0,0,0);
      const end=new Date(start.getTime()+7*DAY);
      const scheduled=missions.filter(m=>m.scheduled_start&&new Date(m.scheduled_start)>=start&&new Date(m.scheduled_start)<end);
      const estimatedHours=scheduled.reduce((s,m)=>{
        if(m.scheduled_start&&m.scheduled_end)return s+hoursBetween(m.scheduled_start,m.scheduled_end);
        return s+4;
      },0);
      const capacity=activeMembers.length*settings.capacityHours;
      return {start,end,scheduled,estimatedHours,capacity,load:capacity?estimatedHours/capacity*100:0};
    });

    const clientStats=clients.map(client=>{
      const inv=invoices.filter(i=>i.client_id===client.id);
      const q=quotes.filter(x=>x.client_id===client.id);
      const revenue=inv.reduce((s,i)=>s+invoiceHT(i),0);
      const outstanding=inv.reduce((s,i)=>s+Math.max(0,invoiceTTC(i)-paid(i)),0);
      const overdueValue=inv.filter(i=>i.due_date&&new Date(i.due_date).getTime()<now&&i.status!=='paid').reduce((s,i)=>s+Math.max(0,invoiceTTC(i)-paid(i)),0);
      const won=q.filter(x=>x.status==='accepted').length;
      const decidedQ=q.filter(x=>x.status==='accepted'||x.status==='rejected').length;
      const winRate=decidedQ?won/decidedQ*100:0;
      const activeJobs=missions.filter(m=>m.client_id===client.id&&['accepted','planned','in_progress'].includes(m.status)).length;
      let score=100;
      if(!client.phone&&!client.email)score-=20;
      if(overdueValue>0)score-=Math.min(45,15+overdueValue/1000*5);
      if(decidedQ>=2&&winRate<30)score-=10;
      if(activeJobs>0)score+=5;
      score=Math.max(0,Math.min(100,score));
      return {client,revenue,outstanding,overdueValue,winRate,activeJobs,score};
    }).sort((a,b)=>b.revenue-a.revenue);

    const contractMonthly=maintenanceContracts.filter(c=>c.active).reduce((s,c)=>s+c.amount_ht/(c.frequency==='monthly'?1:c.frequency==='quarterly'?3:12),0);
    const scenarioMultiplier=scenario==='stress'?0.55:scenario==='optimistic'?0.9:0.72;
    const winRate=scenario==='stress'?Math.max(15,settings.quoteWinRate-20):scenario==='optimistic'?Math.min(90,settings.quoteWinRate+15):settings.quoteWinRate;
    const forecast=Array.from({length:6},(_,idx)=>{
      const month=new Date();month.setMonth(month.getMonth()+idx,1);month.setHours(0,0,0,0);
      const next=new Date(month);next.setMonth(next.getMonth()+1);
      const dueInvoices=openInvoices.filter(x=>x.invoice.due_date&&new Date(x.invoice.due_date)>=month&&new Date(x.invoice.due_date)<next).reduce((s,x)=>s+x.remaining,0);
      const plannedRevenue=missions.filter(m=>m.scheduled_start&&new Date(m.scheduled_start)>=month&&new Date(m.scheduled_start)<next).reduce((s,m)=>s+(m.price_ht||0),0);
      const pipelineShare=pipeline*(winRate/100)/6;
      const inflow=dueInvoices*scenarioMultiplier+plannedRevenue*0.5+pipelineShare+contractMonthly;
      const historicExpense=businessExpenses.slice(0,30).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0)/Math.max(1,Math.min(3,businessExpenses.length||1));
      const outflow=Math.max(historicExpense,cashOutMonth)*(scenario==='stress'?1.2:scenario==='optimistic'?0.95:1);
      return {month,inflow,outflow,net:inflow-outflow};
    });
    let rolling=cashBalanceProxy;
    const rollingForecast=forecast.map(row=>{rolling+=row.net;return {...row,rolling}});

    const lowStock=inventory.filter(i=>i.quantity<=i.minimum_quantity);
    const activeMissions=missions.filter(m=>['planned','in_progress','accepted'].includes(m.status));
    const unassigned=activeMissions.filter(m=>!m.assigned_user_id);
    const unscheduled=activeMissions.filter(m=>!m.scheduled_start||!m.scheduled_end);
    const riskProjects=projectBudgets.filter(p=>p.risk!=='low').sort((a,b)=>a.marginRate-b.marginRate);
    const riskClients=clientStats.filter(c=>c.score<70||c.overdueValue>0).sort((a,b)=>a.score-b.score);
    const overloaded=horizon.filter(w=>w.load>100);

    let health=100;
    health-=Math.min(25,overdue.length*5);
    health-=Math.min(15,acceptedUnbilled.length*4);
    health-=Math.min(15,riskProjects.length*3);
    health-=Math.min(10,unassigned.length*2);
    health-=Math.min(10,unscheduled.length*2);
    health-=Math.min(10,overloaded.length*3);
    health-=Math.min(8,lowStock.length*2);
    if(cashBalanceProxy<settings.cashFloor)health-=10;
    health=Math.max(0,health);

    return {openInvoices,receivable,overdue,overdueAmount,cashInMonth,cashOutMonth,billedMonth,cashBalanceProxy,quoteOpen,conversion,pipeline,acceptedUnbilled,projectBudgets,totalRevenue,totalMargin,marginRate,horizon,clientStats,contractMonthly,rollingForecast,lowStock,unassigned,unscheduled,riskProjects,riskClients,overloaded,health};
  },[clients,missions,quotes,invoices,team,timeEntries,businessExpenses,maintenanceContracts,inventory,settings,scenario,now]);

  const autoPlan=useMemo(()=>{
    const rows:Omit<TowerAction,'id'|'done'|'created_at'>[]=[];
    if(model.overdue.length)rows.push({title:`Relancer ${model.overdue.length} impayé(s)`,detail:`${euro(model.overdueAmount)} à récupérer`,href:'/invoices',severity:'critical'});
    if(model.acceptedUnbilled.length)rows.push({title:`Facturer ${model.acceptedUnbilled.length} devis accepté(s)`,detail:'Devis gagnés sans facture liée',href:'/quotes',severity:'critical'});
    if(model.riskProjects.length)rows.push({title:`Protéger la marge de ${model.riskProjects.length} chantier(s)`,detail:'Marge sous l’objectif défini',href:'/profitability',severity:'warning'});
    if(model.overloaded.length)rows.push({title:`Rééquilibrer ${model.overloaded.length} semaine(s)`,detail:'Charge planifiée supérieure à la capacité',href:'/smart-planning',severity:'warning'});
    if(model.unassigned.length)rows.push({title:`Affecter ${model.unassigned.length} chantier(s)`,detail:'Aucun responsable défini',href:'/missions',severity:'warning'});
    if(model.lowStock.length)rows.push({title:`Réapprovisionner ${model.lowStock.length} article(s)`,detail:'Stock au niveau minimum ou en dessous',href:'/inventory',severity:'warning'});
    if(model.cashBalanceProxy<settings.cashFloor)rows.push({title:'Sécuriser la trésorerie',detail:`Solde mensuel ${euro(model.cashBalanceProxy)} sous le seuil ${euro(settings.cashFloor)}`,href:'/cashflow',severity:'critical'});
    if(!rows.length)rows.push({title:'Aucun risque prioritaire',detail:'Les indicateurs principaux sont sous contrôle',href:'/reports',severity:'info'});
    return rows;
  },[model,settings.cashFloor]);

  function importAutoPlan(){const additions=autoPlan.filter(p=>!actions.some(a=>!a.done&&a.title===p.title)).map(p=>({...p,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,done:false,created_at:new Date().toISOString()}));saveActions([...additions,...actions])}
  function missionName(id:string){return missions.find(m=>m.id===id)?.title||'Chantier'}
  function exportCsv(){
    const rows=[['type','nom','valeur_1','valeur_2','statut'],...model.projectBudgets.map(p=>['chantier',missionName(p.mission_id),String(p.revenue),String(p.margin),p.risk]),...model.clientStats.map(c=>['client',clientLabel(c.client),String(c.revenue),String(c.outstanding),String(Math.round(c.score))]),...model.rollingForecast.map(f=>['prevision',f.month.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),String(f.inflow),String(f.outflow),String(f.rolling)])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n');
    const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='closerflow-control-tower-v13.6.csv';a.click();URL.revokeObjectURL(url);
  }

  return <div className="tower-page">
    <div className="page-title tower-heading"><div><p className="eyebrow">CONTROL TOWER</p><h1>CloserFlow 13.6</h1><p>Prévision, rentabilité, capacité équipe, risque client et plan d’action dans un seul cockpit.</p></div><div className={`tower-health ${model.health<60?'danger':model.health<80?'warning':''}`}><Gauge/><strong>{model.health}</strong><span>/100</span></div></div>

    <section className="tower-kpis">
      <article className={model.cashBalanceProxy<settings.cashFloor?'danger':''}><WalletCards/><div><strong>{euro(model.cashBalanceProxy)}</strong><span>Solde du mois</span></div></article>
      <article className={model.overdueAmount>0?'danger':''}><Banknote/><div><strong>{euro(model.overdueAmount)}</strong><span>Impayés</span></div></article>
      <article><LineChart/><div><strong>{euro(model.pipeline)}</strong><span>Pipeline devis</span></div></article>
      <article className={model.marginRate<settings.marginTarget?'warning':''}><TrendingUp/><div><strong>{pct(model.marginRate)}</strong><span>Marge suivie</span></div></article>
      <article className={model.overloaded.length?'warning':''}><UsersRound/><div><strong>{model.overloaded.length}</strong><span>Semaines surchargées</span></div></article>
    </section>

    <div className="tower-tabs">
      <button className={tab==='forecast'?'active':''} onClick={()=>setTab('forecast')}><BarChart3/>Prévision</button>
      <button className={tab==='projects'?'active':''} onClick={()=>setTab('projects')}><HardHat/>Chantiers</button>
      <button className={tab==='capacity'?'active':''} onClick={()=>setTab('capacity')}><CalendarDays/>Capacité</button>
      <button className={tab==='clients'?'active':''} onClick={()=>setTab('clients')}><UserRoundCheck/>Clients</button>
      <button className={tab==='actions'?'active':''} onClick={()=>setTab('actions')}><ClipboardList/>Actions</button>
    </div>

    {tab==='forecast'&&<div className="tower-grid">
      <section className="card tower-main"><header className="section-header"><div><h2>Prévision de trésorerie</h2><p>Projection à 6 mois basée sur les données disponibles.</p></div><div className="tower-scenarios"><button className={scenario==='stress'?'active':''} onClick={()=>setScenario('stress')}>Stress</button><button className={scenario==='base'?'active':''} onClick={()=>setScenario('base')}>Base</button><button className={scenario==='optimistic'?'active':''} onClick={()=>setScenario('optimistic')}>Optimiste</button></div></header>
        <div className="tower-forecast">{model.rollingForecast.map(row=><article key={row.month.toISOString()} className={row.rolling<settings.cashFloor?'risk':''}><div><strong>{row.month.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'})}</strong><small>Solde projeté</small></div><b>{euro(row.rolling)}</b><div className="tower-flow"><span>+ {euro(row.inflow)}</span><span>- {euro(row.outflow)}</span></div></article>)}</div>
        <div className="tower-stat-strip"><p><span>Facturé ce mois</span><strong>{euro(model.billedMonth)}</strong></p><p><span>Encaissé</span><strong>{euro(model.cashInMonth)}</strong></p><p><span>Décaissements</span><strong>{euro(model.cashOutMonth)}</strong></p><p><span>Récurrent mensuel</span><strong>{euro(model.contractMonthly)}</strong></p></div>
      </section>
      <section className="card"><header className="section-header"><div><h2>Hypothèses</h2><p>Ajuste les seuils utilisés par le cockpit.</p></div><Target/></header><div className="tower-settings"><label>Plancher trésorerie (€)<input type="number" value={settings.cashFloor} onChange={e=>saveSettings({...settings,cashFloor:Number(e.target.value)||0})}/></label><label>Marge cible (%)<input type="number" value={settings.marginTarget} onChange={e=>saveSettings({...settings,marginTarget:Number(e.target.value)||0})}/></label><label>Capacité / personne / semaine<input type="number" value={settings.capacityHours} onChange={e=>saveSettings({...settings,capacityHours:Number(e.target.value)||0})}/></label><label>Taux de gain devis (%)<input type="number" value={settings.quoteWinRate} onChange={e=>saveSettings({...settings,quoteWinRate:Number(e.target.value)||0})}/></label></div></section>
      <section className="card tower-wide"><header className="section-header"><div><h2>Plan automatique</h2><p>Priorités calculées à partir des risques détectés.</p></div><button className="primary" onClick={importAutoPlan}><Sparkles/>Ajouter aux actions</button></header><div className="tower-plan">{autoPlan.map((a,i)=><Link to={a.href} key={`${a.title}-${i}`} className={a.severity}><span>{a.severity==='critical'?<ShieldAlert/>:a.severity==='warning'?<AlertTriangle/>:<CheckCircle2/>}</span><div><strong>{a.title}</strong><small>{a.detail}</small></div><ArrowRight/></Link>)}</div></section>
    </div>}

    {tab==='projects'&&<div className="tower-grid"><section className="card tower-wide"><header className="section-header"><div><h2>Contrôle économique des chantiers</h2><p>CA, coûts, marge et écart par dossier.</p></div><Link className="secondary" to="/profitability">Rentabilité détaillée</Link></header><div className="tower-projects">{model.projectBudgets.sort((a,b)=>a.marginRate-b.marginRate).map(p=><article key={p.mission_id} className={p.risk}><div><strong>{missionName(p.mission_id)}</strong><small>Budget / prix prévu {euro(p.budget)}</small></div><div><span>CA HT</span><b>{euro(p.revenue)}</b></div><div><span>Main-d’œuvre</span><b>{euro(p.labour)}</b></div><div><span>Dépenses</span><b>{euro(p.expenses)}</b></div><div><span>Marge</span><b className={p.margin<0?'negative':''}>{euro(p.margin)} · {pct(p.marginRate)}</b></div><div className="row-actions"><Link to={`/missions/${p.mission_id}`}>Ouvrir</Link>{p.risk!=='low'&&<button onClick={()=>addAction({title:`Protéger marge — ${missionName(p.mission_id)}`,detail:`Marge ${pct(p.marginRate)} pour objectif ${settings.marginTarget}%`,href:`/missions/${p.mission_id}`,severity:p.risk==='high'?'critical':'warning'})}>Créer action</button>}</div></article>)}</div></section></div>}

    {tab==='capacity'&&<div className="tower-grid"><section className="card tower-wide"><header className="section-header"><div><h2>Capacité à 6 semaines</h2><p>Charge planifiée comparée à la capacité de l’équipe active.</p></div><Link className="secondary" to="/smart-planning">Planning intelligent</Link></header><div className="tower-capacity">{model.horizon.map(w=><article key={w.start.toISOString()} className={w.load>100?'danger':w.load>85?'warning':''}><div><strong>Semaine du {w.start.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</strong><small>{w.scheduled.length} intervention(s)</small></div><div className="tower-load"><i style={{width:`${Math.min(100,w.load)}%`}}/><span>{pct(w.load)}</span></div><div><b>{w.estimatedHours.toFixed(1)} h</b><small>sur {w.capacity.toFixed(0)} h</small></div></article>)}</div></section><section className="card"><h2>Blocages planning</h2><div className="tower-mini-list"><Link to="/missions"><span>Sans responsable</span><b>{model.unassigned.length}</b></Link><Link to="/planning"><span>Sans planning complet</span><b>{model.unscheduled.length}</b></Link><Link to="/inventory"><span>Stocks faibles</span><b>{model.lowStock.length}</b></Link></div></section></div>}

    {tab==='clients'&&<div className="tower-grid"><section className="card tower-wide"><header className="section-header"><div><h2>Portefeuille clients</h2><p>Valeur, encours, risque et conversion par client.</p></div><Link className="secondary" to="/clients">Fiches clients</Link></header><div className="tower-clients">{model.clientStats.map(c=><article key={c.client.id} className={c.score<60?'danger':c.score<80?'warning':''}><div className="tower-client-score"><b>{Math.round(c.score)}</b><span>/100</span></div><div><strong>{clientLabel(c.client)}</strong><small>{c.activeJobs} chantier(s) actif(s) · conversion {pct(c.winRate)}</small></div><div><span>CA HT</span><b>{euro(c.revenue)}</b></div><div><span>Encours</span><b>{euro(c.outstanding)}</b></div><div><span>En retard</span><b className={c.overdueValue>0?'negative':''}>{euro(c.overdueValue)}</b></div>{(c.score<70||c.overdueValue>0)&&<button onClick={()=>addAction({title:`Sécuriser client — ${clientLabel(c.client)}`,detail:c.overdueValue>0?`${euro(c.overdueValue)} en retard`:`Score client ${Math.round(c.score)}/100`,href:'/clients',severity:c.overdueValue>0?'critical':'warning'})}>Créer action</button>}</article>)}</div></section></div>}

    {tab==='actions'&&<div className="tower-grid"><section className="card tower-wide"><header className="section-header"><div><h2>Plan d’action dirigeant</h2><p>{actions.filter(a=>!a.done).length} action(s) ouvertes.</p></div><div className="row-actions"><button className="secondary" onClick={importAutoPlan}><RefreshCw/>Actualiser</button><button className="secondary" onClick={clearDone}>Nettoyer terminées</button><button className="secondary" onClick={exportCsv}><Download/>Export CSV</button></div></header><div className="tower-actions">{actions.length?actions.map(a=><article key={a.id} className={`${a.severity} ${a.done?'done':''}`}><button onClick={()=>toggleAction(a.id)}>{a.done?<CheckCircle2/>:<ClipboardList/>}</button><div><strong>{a.title}</strong><small>{a.detail}</small></div><Link to={a.href}>Ouvrir <ArrowRight/></Link></article>):<div className="empty-state"><CheckCircle2/><p>Aucune action enregistrée. Utilise « Actualiser » pour générer le plan automatique.</p></div>}</div></section></div>}
  </div>;
}
