import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, BrainCircuit, BriefcaseBusiness, CalendarRange, CheckCircle2, CircleDollarSign, Download, Gauge, Lightbulb, LineChart, RefreshCw, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, UsersRound, WalletCards } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const DAY=86400000;
const SETTINGS_KEY='closerflow.executiveIntelligence.settings.v14';
type Horizon=3|6|12;
type Severity='critical'|'warning'|'opportunity'|'info';
interface Settings{cashFloor:number;marginTarget:number;capacityHours:number;conversionTarget:number;collectionTarget:number;}
interface Insight{id:string;severity:Severity;title:string;detail:string;impact:string;href:string;score:number;}
const defaults:Settings={cashFloor:5000,marginTarget:30,capacityHours:35,conversionTarget:45,collectionTarget:85};
const readSettings=():Settings=>{try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return defaults}};
const euro=(v:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(v)?v:0);
const pct=(v:number)=>`${(Number.isFinite(v)?v:0).toFixed(1)} %`;
const lineHT=(doc:any)=>(doc.lines||[]).reduce((s:number,l:any)=>s+(Number(l.quantity)||0)*(Number(l.unit_price_ht)||0),0)*(1-(Number(doc.discount_percent)||0)/100);
const invoiceTTC=(i:any)=>lineHT(i)*(1+(Number(i.vat_rate)||0)/100);
const paid=(i:any)=>(i.payments||[]).reduce((s:number,p:any)=>s+(Number(p.amount)||0),0);
const hours=(a:string,b:string|null)=>Math.max(0,(new Date(b||Date.now()).getTime()-new Date(a).getTime())/3600000);
const clientName=(c:any)=>c?(c.company_name||`${c.first_name||''} ${c.last_name||''}`.trim()||'Client'):'Client';
const monthKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthLabel=(key:string)=>new Date(`${key}-01T12:00:00`).toLocaleDateString('fr-FR',{month:'short',year:'2-digit'});
const weekNumber=(date:Date)=>{const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const start=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d.getTime()-start.getTime())/DAY)+1)/7)};
const download=(name:string,content:string)=>{const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)};

export function ExecutiveIntelligencePage(){
 const {clients,missions,quotes,invoices,team,timeEntries,businessExpenses,maintenanceContracts,inventory}=useAppData();
 const [horizon,setHorizon]=useState<Horizon>(6);
 const [settings,setSettings]=useState<Settings>(readSettings);
 const [refreshedAt,setRefreshedAt]=useState(new Date());
 const save=(next:Settings)=>{setSettings(next);localStorage.setItem(SETTINGS_KEY,JSON.stringify(next))};
 const model=useMemo(()=>{
  const now=Date.now();
  const openInvoices=invoices.map(i=>({i,total:invoiceTTC(i),paid:paid(i)})).map(x=>({...x,remaining:Math.max(0,x.total-x.paid)})).filter(x=>x.remaining>.01&&x.i.status!=='draft');
  const receivable=openInvoices.reduce((s,x)=>s+x.remaining,0);
  const overdue=openInvoices.filter(x=>x.i.due_date&&new Date(x.i.due_date).getTime()<now);
  const overdueAmount=overdue.reduce((s,x)=>s+x.remaining,0);
  const billed=invoices.reduce((s,i)=>s+lineHT(i),0);
  const collectedTtc=invoices.reduce((s,i)=>s+paid(i),0);
  const collectionRate=invoices.reduce((s,i)=>s+invoiceTTC(i),0)?collectedTtc/invoices.reduce((s,i)=>s+invoiceTTC(i),0)*100:100;
  const decided=quotes.filter(q=>q.status==='accepted'||q.status==='rejected');
  const won=decided.filter(q=>q.status==='accepted');
  const conversion=decided.length?won.length/decided.length*100:0;
  const pipeline=quotes.filter(q=>q.status==='sent'||q.status==='draft').reduce((s,q)=>s+lineHT(q),0);
  const acceptedUnbilled=quotes.filter(q=>q.status==='accepted'&&!invoices.some(i=>i.quote_id===q.id));
  const labour=timeEntries.reduce((s,t)=>s+hours(t.started_at,t.ended_at)*t.hourly_cost,0);
  const expenses=businessExpenses.reduce((s,e)=>s+e.amount_ht,0)+missions.reduce((s,m)=>s+(m.expenses||[]).reduce((a,e)=>a+e.amount,0),0);
  const margin=billed-labour-expenses;
  const marginRate=billed?margin/billed*100:0;
  const projectRows=missions.map(m=>{const revenue=invoices.filter(i=>i.mission_id===m.id).reduce((s,i)=>s+lineHT(i),0);const labourCost=timeEntries.filter(t=>t.mission_id===m.id).reduce((s,t)=>s+hours(t.started_at,t.ended_at)*t.hourly_cost,0);const direct=businessExpenses.filter(e=>e.mission_id===m.id).reduce((s,e)=>s+e.amount_ht,0)+(m.expenses||[]).reduce((s,e)=>s+e.amount,0);const cost=labourCost+direct;const projectMargin=revenue-cost;const rate=revenue?projectMargin/revenue*100:0;return{m,revenue,cost,margin:projectMargin,rate}}).filter(x=>x.revenue||x.cost).sort((a,b)=>a.rate-b.rate);
  const activeMembers=team.filter(t=>t.active);
  const capacityWeeks=Array.from({length:6},(_,idx)=>{const start=new Date();start.setDate(start.getDate()-((start.getDay()+6)%7)+idx*7);start.setHours(0,0,0,0);const end=new Date(start.getTime()+7*DAY);const jobs=missions.filter(m=>m.scheduled_start&&new Date(m.scheduled_start)>=start&&new Date(m.scheduled_start)<end);const planned=jobs.reduce((s,m)=>s+(m.scheduled_start&&m.scheduled_end?hours(m.scheduled_start,m.scheduled_end):4),0);const capacity=activeMembers.length*settings.capacityHours;return{start,planned,capacity,load:capacity?planned/capacity*100:0,jobs}});
  const months=Array.from({length:horizon},(_,idx)=>{const d=new Date();d.setMonth(d.getMonth()+idx,1);return monthKey(d)});
  const recurringMonthly=maintenanceContracts.filter(c=>c.active).reduce((s,c)=>s+c.amount_ht/(c.frequency==='monthly'?1:c.frequency==='quarterly'?3:12),0);
  const averageExpense=Math.max(0,businessExpenses.slice(-30).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0)/Math.max(1,Math.min(3,horizon)));
  let rolling=-businessExpenses.filter(e=>!e.paid).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);
  const forecast=months.map((key,idx)=>{const month=new Date(`${key}-01T12:00:00`);const next=new Date(month);next.setMonth(next.getMonth()+1);const due=openInvoices.filter(x=>x.i.due_date&&new Date(x.i.due_date)>=month&&new Date(x.i.due_date)<next).reduce((s,x)=>s+x.remaining,0);const planned=missions.filter(m=>m.scheduled_start&&new Date(m.scheduled_start)>=month&&new Date(m.scheduled_start)<next).reduce((s,m)=>s+(m.price_ht||0),0);const pipelineWeighted=pipeline*(Math.max(10,conversion||settings.conversionTarget)/100)/horizon;const inflow=due*.78+planned*.55+pipelineWeighted+recurringMonthly;const outflow=Math.max(averageExpense,idx===0?businessExpenses.filter(e=>e.paid&&new Date(e.expense_date).getMonth()===new Date().getMonth()).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0):0);rolling+=inflow-outflow;return{key,inflow,outflow,net:inflow-outflow,rolling}});
  const lowStock=inventory.filter(i=>i.quantity<=i.minimum_quantity);
  const active=missions.filter(m=>['accepted','planned','in_progress'].includes(m.status));
  const unassigned=active.filter(m=>!m.assigned_user_id);
  const unscheduled=active.filter(m=>!m.scheduled_start||!m.scheduled_end);
  const incompleteClients=clients.filter(c=>!c.email&&!c.phone);
  const clientRows=clients.map(c=>{const inv=invoices.filter(i=>i.client_id===c.id);const revenue=inv.reduce((s,i)=>s+lineHT(i),0);const outstanding=inv.reduce((s,i)=>s+Math.max(0,invoiceTTC(i)-paid(i)),0);const late=inv.filter(i=>i.due_date&&new Date(i.due_date).getTime()<now).reduce((s,i)=>s+Math.max(0,invoiceTTC(i)-paid(i)),0);return{c,revenue,outstanding,late}}).filter(x=>x.revenue||x.outstanding).sort((a,b)=>b.revenue-a.revenue);
  const insights:Insight[]=[];
  const add=(x:Insight)=>insights.push(x);
  if(overdueAmount>0)add({id:'overdue',severity:'critical',title:'Accélérer les encaissements',detail:`${overdue.length} facture(s) échue(s) représentent ${euro(overdueAmount)}.`,impact:`+${euro(overdueAmount)} de trésorerie potentielle`,href:'/invoices',score:100});
  if(marginRate<settings.marginTarget)add({id:'margin',severity:marginRate<settings.marginTarget-10?'critical':'warning',title:'Protéger la marge',detail:`La marge suivie est de ${pct(marginRate)} pour une cible de ${pct(settings.marginTarget)}.`,impact:`Écart ${pct(settings.marginTarget-marginRate)}`,href:'/profitability',score:92});
  if(acceptedUnbilled.length)add({id:'unbilled',severity:'warning',title:'Facturer les devis gagnés',detail:`${acceptedUnbilled.length} devis accepté(s) ne sont pas encore facturés.`,impact:euro(acceptedUnbilled.reduce((s,q)=>s+lineHT(q),0)),href:'/quotes',score:88});
  const overloaded=capacityWeeks.filter(w=>w.load>100);if(overloaded.length)add({id:'capacity',severity:'warning',title:'Rééquilibrer la charge équipe',detail:`${overloaded.length} semaine(s) dépassent 100 % de capacité.`,impact:`Pic ${pct(Math.max(...overloaded.map(x=>x.load)))}`,href:'/smart-planning',score:82});
  if(unassigned.length||unscheduled.length)add({id:'planning',severity:'warning',title:'Sécuriser le planning',detail:`${unassigned.length} mission(s) sans responsable, ${unscheduled.length} sans créneau complet.`,impact:'Risque de retard terrain',href:'/planning',score:78});
  if(conversion<settings.conversionTarget&&decided.length>=2)add({id:'conversion',severity:'opportunity',title:'Améliorer la conversion commerciale',detail:`Conversion ${pct(conversion)} contre une cible de ${pct(settings.conversionTarget)}.`,impact:`Pipeline ${euro(pipeline)}`,href:'/commercial-crm',score:70});
  if(lowStock.length)add({id:'stock',severity:'warning',title:'Réapprovisionner le stock critique',detail:`${lowStock.length} article(s) au seuil minimum ou en dessous.`,impact:'Évite les ruptures chantier',href:'/supply-chain',score:68});
  if(incompleteClients.length)add({id:'data',severity:'info',title:'Compléter les fiches clients',detail:`${incompleteClients.length} client(s) sans téléphone ni e-mail.`,impact:'Relances et portail plus fiables',href:'/clients',score:45});
  const futureLow=forecast.find(x=>x.rolling<settings.cashFloor);if(futureLow)add({id:'cash',severity:'critical',title:'Prévenir un creux de trésorerie',detail:`Projection sous ${euro(settings.cashFloor)} vers ${monthLabel(futureLow.key)}.`,impact:`Projection ${euro(futureLow.rolling)}`,href:'/cashflow',score:96});
  insights.sort((a,b)=>b.score-a.score);
  const health=Math.max(0,Math.min(100,100-(overdueAmount>0?18:0)-(marginRate<settings.marginTarget?15:0)-(overloaded.length?12:0)-(unassigned.length?10:0)-(unscheduled.length?8:0)-(lowStock.length?8:0)-(incompleteClients.length?5:0)));
  return{receivable,overdueAmount,billed,collectedTtc,collectionRate,conversion,pipeline,margin,marginRate,projectRows,capacityWeeks,forecast,clientRows,insights,health,acceptedUnbilled,lowStock};
 },[clients,missions,quotes,invoices,team,timeEntries,businessExpenses,maintenanceContracts,inventory,horizon,settings,refreshedAt]);
 const maxForecast=Math.max(1,...model.forecast.flatMap(x=>[x.inflow,x.outflow]));
 const exportCsv=()=>download('closerflow-v14-intelligence.csv',['Indicateur;Valeur',`Score santé;${model.health}`,`CA HT;${model.billed.toFixed(2)}`,`Marge;${model.margin.toFixed(2)}`,`Taux marge;${model.marginRate.toFixed(1)}%`,`Créances;${model.receivable.toFixed(2)}`,`Échues;${model.overdueAmount.toFixed(2)}`,`Conversion;${model.conversion.toFixed(1)}%`,'','Recommandation;Priorité;Impact',...model.insights.map(i=>`${i.title.replaceAll(';',',')};${i.severity};${i.impact.replaceAll(';',',')}`),'','Mois;Entrées;Sorties;Net;Cumul',...model.forecast.map(x=>`${x.key};${x.inflow.toFixed(2)};${x.outflow.toFixed(2)};${x.net.toFixed(2)};${x.rolling.toFixed(2)}`)].join('\n'));
 return <>
  <div className="page-title"><div><p className="eyebrow">BUSINESS INTELLIGENCE & AI CORE</p><h1>Direction intelligente v14</h1><p className="muted">Prévisions, risques, opportunités et recommandations calculés localement à partir des données CloserFlow.</p></div><div className="v14-actions"><select value={horizon} onChange={e=>setHorizon(Number(e.target.value) as Horizon)}><option value={3}>3 mois</option><option value={6}>6 mois</option><option value={12}>12 mois</option></select><button className="secondary" onClick={()=>setRefreshedAt(new Date())}><RefreshCw/>Actualiser</button><button className="secondary" onClick={exportCsv}><Download/>CSV</button></div></div>
  <section className="v14-hero"><div><BrainCircuit/><div><span>Score de santé</span><strong>{model.health}/100</strong><small>{model.insights.filter(i=>i.severity==='critical').length} critique(s) · analyse {refreshedAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small></div></div><div className="v14-health"><i style={{width:`${model.health}%`}}/></div></section>
  <section className="v14-kpis"><article><CircleDollarSign/><span>CA HT suivi</span><strong>{euro(model.billed)}</strong><small>Pipeline {euro(model.pipeline)}</small></article><article><TrendingUp/><span>Marge</span><strong>{euro(model.margin)}</strong><small>{pct(model.marginRate)} · cible {pct(settings.marginTarget)}</small></article><article><Banknote/><span>Créances</span><strong>{euro(model.receivable)}</strong><small>{euro(model.overdueAmount)} échus</small></article><article><Target/><span>Conversion</span><strong>{pct(model.conversion)}</strong><small>Encaissement {pct(model.collectionRate)}</small></article></section>
  <div className="v14-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">COPILOTE</p><h2>Décisions recommandées</h2></div><Sparkles/></div><div className="v14-insights">{model.insights.slice(0,8).map(i=><article key={i.id} className={`v14-insight ${i.severity}`}><div>{i.severity==='critical'?<ShieldAlert/>:i.severity==='warning'?<AlertTriangle/>:i.severity==='opportunity'?<Lightbulb/>:<CheckCircle2/>}<span><strong>{i.title}</strong><small>{i.detail}</small></span></div><footer><b>{i.impact}</b><Link to={i.href}>Agir</Link></footer></article>)}{!model.insights.length&&<p className="muted">Aucune anomalie prioritaire détectée.</p>}</div></section>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">PRÉVISION</p><h2>Trésorerie {horizon} mois</h2></div><LineChart/></div><div className="v14-forecast">{model.forecast.map(x=><article key={x.key}><strong>{monthLabel(x.key)}</strong><div className="v14-bars"><i className="in" style={{width:`${x.inflow/maxForecast*100}%`}}/><i className="out" style={{width:`${x.outflow/maxForecast*100}%`}}/></div><span>{euro(x.net)}</span><small>Cumul {euro(x.rolling)}</small></article>)}</div></section></div>
  <div className="v14-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">CHANTIERS</p><h2>Marge à surveiller</h2></div><BriefcaseBusiness/></div><div className="v14-table">{model.projectRows.slice(0,8).map(x=><Link to={`/missions/${x.m.id}`} key={x.m.id}><span><strong>{x.m.title}</strong><small>{euro(x.revenue)} facturés · {euro(x.cost)} coûts</small></span><b className={x.rate<settings.marginTarget?'bad':'good'}>{pct(x.rate)}</b></Link>)}{!model.projectRows.length&&<p className="muted">Pas encore de chantier avec coûts ou facturation.</p>}</div></section>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">CAPACITÉ</p><h2>6 prochaines semaines</h2></div><CalendarRange/></div><div className="v14-capacity">{model.capacityWeeks.map((w,idx)=><article key={idx}><span>S{weekNumber(w.start)}</span><div><i style={{width:`${Math.min(100,w.load)}%`}} className={w.load>100?'over':''}/></div><strong>{pct(w.load)}</strong><small>{w.planned.toFixed(0)} h / {w.capacity.toFixed(0)} h</small></article>)}</div></section></div>
  <div className="v14-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">CLIENTS</p><h2>Valeur & risque</h2></div><UsersRound/></div><div className="v14-table">{model.clientRows.slice(0,8).map(x=><Link to="/clients" key={x.c.id}><span><strong>{clientName(x.c)}</strong><small>{euro(x.revenue)} de CA</small></span><b className={x.late>0?'bad':'good'}>{x.late>0?`${euro(x.late)} en retard`:euro(x.outstanding)}</b></Link>)}</div></section>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">OBJECTIFS</p><h2>Réglages du copilote</h2></div><Gauge/></div><div className="v14-settings"><label>Trésorerie plancher<input type="number" value={settings.cashFloor} onChange={e=>save({...settings,cashFloor:Number(e.target.value)})}/></label><label>Marge cible (%)<input type="number" value={settings.marginTarget} onChange={e=>save({...settings,marginTarget:Number(e.target.value)})}/></label><label>Capacité / personne (h)<input type="number" value={settings.capacityHours} onChange={e=>save({...settings,capacityHours:Number(e.target.value)})}/></label><label>Conversion cible (%)<input type="number" value={settings.conversionTarget} onChange={e=>save({...settings,conversionTarget:Number(e.target.value)})}/></label><label>Encaissement cible (%)<input type="number" value={settings.collectionTarget} onChange={e=>save({...settings,collectionTarget:Number(e.target.value)})}/></label></div></section></div>
  <section className="v14-shortcuts"><Link to="/automation-hub"><Sparkles/>Automatisations</Link><Link to="/revenue-ops"><WalletCards/>Revenue Ops</Link><Link to="/control-tower"><Gauge/>Control Tower</Link><Link to="/business-intelligence"><TrendingDown/>BI historique</Link></section>
 </>;
}
