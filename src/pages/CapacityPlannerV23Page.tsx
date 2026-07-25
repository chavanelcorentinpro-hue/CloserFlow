import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CalendarRange, CheckCircle2, Clock3, Gauge, Hammer, Layers3, RefreshCw, Scale, TrendingUp, UsersRound, WalletCards } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { totals } from '../lib/documents';

type CapacityMode='safe'|'balanced'|'aggressive';
const KEY='closerflow.v23.capacity.settings';
const defaults={workers:2,hoursPerWeek:35,mode:'balanced' as CapacityMode,targetMargin:30};
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaults}}
function startOfWeek(d:Date){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}
function addDays(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function weekKey(d:Date){const s=startOfWeek(d);return s.toISOString().slice(0,10)}

export function CapacityPlannerV23Page(){
 const {missions,quotes,invoices,businessExpenses,clients}=useAppData();
 const [settings,setSettings]=useState(load);
 const save=(x:typeof defaults)=>{setSettings(x);localStorage.setItem(KEY,JSON.stringify(x))};

 const data=useMemo(()=>{
  const now=new Date();
  const weeks=Array.from({length:8},(_,i)=>{const start=addDays(startOfWeek(now),i*7);return {key:weekKey(start),start,end:addDays(start,6),hours:0,revenue:0,missions:0,items:[] as string[]}});

  missions.forEach(m=>{
    if(['completed','invoiced','paid','archived'].includes(m.status))return;
    const d=new Date(m.scheduled_start||m.created_at);
    const key=weekKey(d);
    const w=weeks.find(x=>x.key===key);
    if(!w)return;
    const estimatedHours=Math.max(2, Number((m as any).estimated_hours||0) || Math.max(4, ((m.price_ht||0)/75)));
    w.hours+=estimatedHours;
    w.revenue+=m.price_ht||0;
    w.missions+=1;
    w.items.push(m.title);
  });

  const totalCapacity=settings.workers*settings.hoursPerWeek;
  const modeFactor=settings.mode==='safe'?.8:settings.mode==='aggressive'?1.1:.95;
  const usable=totalCapacity*modeFactor;

  const weekly=weeks.map(w=>{
    const load=usable?Math.round((w.hours/usable)*100):0;
    const status=load>100?'critical':load>85?'warning':'good';
    return {...w,load,status};
  });

  const activeRevenue=weekly.reduce((s,w)=>s+w.revenue,0);
  const pendingQuotes=quotes.filter(q=>q.status==='sent'||q.status==='accepted');
  const pipeline=pendingQuotes.reduce((s,q)=>s+totals(q.lines,q.discount_percent,q.vat_rate).ht,0);
  const unpaidExpenses=businessExpenses.filter(e=>!e.paid).reduce((s,e)=>s+e.amount_ht,0);
  const estimatedCost=unpaidExpenses + weekly.reduce((s,w)=>s+w.hours*32,0);
  const margin=activeRevenue>0?Math.round(((activeRevenue-estimatedCost)/activeRevenue)*100):0;

  const alerts=[] as {title:string;detail:string;route:string;level:'critical'|'warning'|'good'}[];
  const overloaded=weekly.filter(w=>w.load>100);
  const underloaded=weekly.filter(w=>w.load<45);
  if(overloaded.length)alerts.push({title:'Surcharge détectée',detail:`${overloaded.length} semaine(s) dépassent la capacité estimée.`,route:'/missions',level:'critical'});
  if(margin<settings.targetMargin)alerts.push({title:'Marge sous objectif',detail:`Marge estimée ${margin}% pour un objectif de ${settings.targetMargin}%.`,route:'/finance-autopilot',level:'warning'});
  if(underloaded.length>=3)alerts.push({title:'Creux de charge à remplir',detail:`${underloaded.length} semaine(s) sont sous 45% de charge.`,route:'/sales-autopilot',level:'warning'});
  if(!alerts.length)alerts.push({title:'Plan de charge sain',detail:'Aucune anomalie majeure détectée sur les 8 prochaines semaines.',route:'/missions',level:'good'});

  const health=Math.max(0,Math.min(100,100-overloaded.length*15-(margin<settings.targetMargin?20:0)-(underloaded.length>=3?10:0)));

  return {weekly,totalCapacity,usable,activeRevenue,pipeline,estimatedCost,margin,alerts,health};
 },[missions,quotes,invoices,businessExpenses,clients,settings]);

 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 23 · CAPACITY PLANNER</p><h1>Prévision de charge & marge</h1><p>Anticipe les semaines trop pleines, les trous de planning et la marge prévisionnelle sur 8 semaines.</p></div><Link className="primary" to="/daily-command-v22"><Gauge/>Daily Command</Link></div>

 <section className="v23-kpis"><article><UsersRound/><span>Capacité brute / semaine</span><strong>{data.totalCapacity} h</strong></article><article><Scale/><span>Capacité utilisable</span><strong>{Math.round(data.usable)} h</strong></article><article><BriefcaseBusiness/><span>CA planifié</span><strong>{euro.format(data.activeRevenue)}</strong></article><article><TrendingUp/><span>Pipeline devis</span><strong>{euro.format(data.pipeline)}</strong></article><article><WalletCards/><span>Marge estimée</span><strong>{data.margin}%</strong></article><article><Gauge/><span>Score capacité</span><strong>{data.health}/100</strong></article></section>

 <section className="v23-grid"><div className="panel"><div className="section-heading"><div><p className="eyebrow">PARAMÈTRES</p><h2>Capacité équipe</h2></div><Hammer/></div><div className="v23-settings"><label>Nombre de personnes<input type="number" min="1" value={settings.workers} onChange={e=>save({...settings,workers:Number(e.target.value)})}/></label><label>Heures / personne / semaine<input type="number" min="1" value={settings.hoursPerWeek} onChange={e=>save({...settings,hoursPerWeek:Number(e.target.value)})}/></label><label>Objectif marge (%)<input type="number" min="0" max="100" value={settings.targetMargin} onChange={e=>save({...settings,targetMargin:Number(e.target.value)})}/></label><label>Mode<select value={settings.mode} onChange={e=>save({...settings,mode:e.target.value as CapacityMode})}><option value="safe">Prudent</option><option value="balanced">Équilibré</option><option value="aggressive">Agressif</option></select></label></div><button className="ghost" onClick={()=>save(defaults)}><RefreshCw/>Réinitialiser</button></div>
 <div className="panel"><div className="section-heading"><div><p className="eyebrow">ALERTES</p><h2>Décisions à prendre</h2></div><AlertTriangle/></div><div className="v23-alerts">{data.alerts.map((a,i)=><Link key={i} to={a.route} className={`v23-alert ${a.level}`}>{a.level==='good'?<CheckCircle2/>:<AlertTriangle/>}<div><strong>{a.title}</strong><small>{a.detail}</small></div><ArrowRight/></Link>)}</div></div></section>

 <section className="panel"><div className="section-heading"><div><p className="eyebrow">8 SEMAINES</p><h2>Plan de charge</h2></div><CalendarRange/></div><div className="v23-weeks">{data.weekly.map(w=><article key={w.key} className={w.status}><header><div><strong>{w.start.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})} → {w.end.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</strong><small>{w.missions} chantier(s)</small></div><b>{w.load}%</b></header><div className="v23-bar"><span style={{width:`${Math.min(100,w.load)}%`}}/></div><footer><span><Clock3/>{Math.round(w.hours)} h</span><span><Layers3/>{euro.format(w.revenue)}</span></footer></article>)}</div></section></>;
}
