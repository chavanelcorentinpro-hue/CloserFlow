import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BadgeEuro, BriefcaseBusiness, CheckCircle2, CircleDollarSign, Gauge, RefreshCw, Scale, ShieldCheck, Target, TrendingDown, TrendingUp, UsersRound, WalletCards } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { totals } from '../lib/documents';

const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const KEY='closerflow.v24.profit.settings';
const defaults={labourHourlyCost:32,targetMargin:30,warningMargin:18};
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaults}}

export function ProfitabilityV24Page(){
 const {missions,invoices,quotes,businessExpenses,clients}=useAppData();
 const [settings,setSettings]=useState(load);
 const save=(x:typeof defaults)=>{setSettings(x);localStorage.setItem(KEY,JSON.stringify(x))};

 const data=useMemo(()=>{
  const missionRows=missions.map(m=>{
    const invs=invoices.filter(i=>i.mission_id===m.id);
    const billed=invs.reduce((s,i)=>s+totals(i.lines,i.discount_percent,i.vat_rate).ht,0);
    const revenue=billed>0?billed:(m.price_ht||0);
    const estimatedHours=Math.max(2, Number((m as any).estimated_hours||0) || Math.max(4,revenue/75));
    const labour=estimatedHours*settings.labourHourlyCost;
    const missionExpenses=businessExpenses.filter(e=>(e as any).mission_id===m.id).reduce((s,e)=>s+e.amount_ht,0);
    const estimatedMaterial=Math.max(0,revenue*.22);
    const cost=labour+missionExpenses+estimatedMaterial;
    const profit=revenue-cost;
    const margin=revenue>0?Math.round((profit/revenue)*100):0;
    const status=margin<0?'critical':margin<settings.warningMargin?'warning':'good';
    return {id:m.id,title:m.title,clientId:m.client_id,revenue,cost,profit,margin,status};
  }).sort((a,b)=>a.margin-b.margin);

  const totalRevenue=missionRows.reduce((s,r)=>s+r.revenue,0);
  const totalCost=missionRows.reduce((s,r)=>s+r.cost,0);
  const totalProfit=totalRevenue-totalCost;
  const globalMargin=totalRevenue>0?Math.round((totalProfit/totalRevenue)*100):0;

  const clientRows=clients.map(c=>{
    const rows=missionRows.filter(r=>r.clientId===c.id);
    const revenue=rows.reduce((s,r)=>s+r.revenue,0);
    const profit=rows.reduce((s,r)=>s+r.profit,0);
    const margin=revenue>0?Math.round((profit/revenue)*100):0;
    const name=c.company_name||[c.first_name,c.last_name].filter(Boolean).join(' ')||'Client'; return {id:c.id,name,revenue,profit,margin,count:rows.length};
  }).filter(c=>c.count>0).sort((a,b)=>a.margin-b.margin);

  const risky=missionRows.filter(r=>r.margin<settings.warningMargin);
  const negative=missionRows.filter(r=>r.margin<0);
  const targetGap=Math.max(0,Math.round((settings.targetMargin-globalMargin)));

  const alerts=[] as {title:string;detail:string;route:string;level:'critical'|'warning'|'good'}[];
  if(negative.length)alerts.push({title:'Chantiers déficitaires détectés',detail:`${negative.length} chantier(s) ont une marge estimée négative.`,route:'/missions',level:'critical'});
  if(risky.length)alerts.push({title:'Marge à surveiller',detail:`${risky.length} chantier(s) sont sous ${settings.warningMargin}% de marge.`,route:'/missions',level:'warning'});
  if(globalMargin<settings.targetMargin)alerts.push({title:'Objectif de marge non atteint',detail:`Marge globale ${globalMargin}% pour un objectif de ${settings.targetMargin}%. Écart ${targetGap} points.`,route:'/finance-autopilot',level:'warning'});
  if(!alerts.length)alerts.push({title:'Rentabilité saine',detail:'Les marges estimées sont dans la zone cible.',route:'/finance-autopilot',level:'good'});

  const score=Math.max(0,Math.min(100,100-negative.length*18-risky.length*6-(globalMargin<settings.targetMargin?15:0)));
  return {missionRows,clientRows,totalRevenue,totalCost,totalProfit,globalMargin,risky,negative,alerts,score};
 },[missions,invoices,quotes,businessExpenses,clients,settings]);

 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 24 · RENTABILITY CONTROL</p><h1>Contrôle de rentabilité</h1><p>Détecte les chantiers qui dérivent, mesure la marge et identifie les clients réellement rentables.</p></div><Link className="primary" to="/capacity-planner-v23"><BriefcaseBusiness/>Capacity Planner</Link></div>

 <section className="v24-kpis"><article><BadgeEuro/><span>CA analysé</span><strong>{euro.format(data.totalRevenue)}</strong></article><article><WalletCards/><span>Coûts estimés</span><strong>{euro.format(data.totalCost)}</strong></article><article><CircleDollarSign/><span>Résultat estimé</span><strong>{euro.format(data.totalProfit)}</strong></article><article><Scale/><span>Marge globale</span><strong>{data.globalMargin}%</strong></article><article><TrendingDown/><span>Chantiers à risque</span><strong>{data.risky.length}</strong></article><article><Gauge/><span>Score rentabilité</span><strong>{data.score}/100</strong></article></section>

 <section className="v24-grid"><div className="panel"><div className="section-heading"><div><p className="eyebrow">HYPOTHÈSES</p><h2>Calcul des marges</h2></div><Target/></div><div className="v24-settings"><label>Coût horaire chargé (€)<input type="number" min="0" value={settings.labourHourlyCost} onChange={e=>save({...settings,labourHourlyCost:Number(e.target.value)})}/></label><label>Objectif de marge (%)<input type="number" min="0" max="100" value={settings.targetMargin} onChange={e=>save({...settings,targetMargin:Number(e.target.value)})}/></label><label>Seuil d'alerte marge (%)<input type="number" min="-100" max="100" value={settings.warningMargin} onChange={e=>save({...settings,warningMargin:Number(e.target.value)})}/></label></div><button className="ghost" onClick={()=>save(defaults)}><RefreshCw/>Réinitialiser</button></div>
 <div className="panel"><div className="section-heading"><div><p className="eyebrow">ALERTES</p><h2>Risques détectés</h2></div><ShieldCheck/></div><div className="v24-alerts">{data.alerts.map((a,i)=><Link key={i} to={a.route} className={`v24-alert ${a.level}`}>{a.level==='good'?<CheckCircle2/>:<AlertTriangle/>}<div><strong>{a.title}</strong><small>{a.detail}</small></div><ArrowRight/></Link>)}</div></div></section>

 <section className="v24-columns"><div className="panel"><div className="section-heading"><div><p className="eyebrow">CHANTIERS</p><h2>Marges les plus faibles</h2></div><TrendingDown/></div><div className="v24-list">{data.missionRows.slice(0,12).map(r=><Link to="/missions" key={r.id} className={`v24-row ${r.status}`}><div><strong>{r.title}</strong><small>CA {euro.format(r.revenue)} · coût {euro.format(r.cost)}</small></div><b>{r.margin}%</b><em>{euro.format(r.profit)}</em><ArrowRight/></Link>)}</div></div>
 <div className="panel"><div className="section-heading"><div><p className="eyebrow">CLIENTS</p><h2>Rentabilité client</h2></div><UsersRound/></div><div className="v24-list">{data.clientRows.slice(0,12).map(c=><Link to="/clients" key={c.id} className="v24-row"><div><strong>{c.name}</strong><small>{c.count} chantier(s) · CA {euro.format(c.revenue)}</small></div><b>{c.margin}%</b><em>{euro.format(c.profit)}</em><ArrowRight/></Link>)}</div></div></section></>;
}
