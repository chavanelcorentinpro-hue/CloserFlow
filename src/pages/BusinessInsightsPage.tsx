import { useMemo } from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, Download, Lightbulb, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const money=(value:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(value);
const docTotal=(doc:{lines:{quantity:number;unit_price_ht:number}[];discount_percent:number;vat_rate:number})=>{
  const ht=doc.lines.reduce((sum,line)=>sum+line.quantity*line.unit_price_ht,0)*(1-(doc.discount_percent||0)/100);
  return {ht,ttc:ht*(1+doc.vat_rate/100)};
};
const daysBetween=(iso:string|null|undefined)=>iso?Math.floor((Date.now()-new Date(iso).getTime())/86400000):0;

export function BusinessInsightsPage(){
 const {company,clients,missions,quotes,invoices,inventory,businessExpenses,maintenanceContracts,timeEntries}=useAppData();
 const analysis=useMemo(()=>{
  const unpaid=invoices.filter(i=>i.status!=='paid');
  const unpaidTtc=unpaid.reduce((sum,i)=>sum+docTotal(i).ttc-(i.payments??[]).reduce((a,p)=>a+p.amount,0),0);
  const overdue=unpaid.filter(i=>i.status==='overdue'||(i.due_date&&new Date(i.due_date).getTime()<Date.now()));
  const accepted=quotes.filter(q=>q.status==='accepted'&&!invoices.some(i=>i.quote_id===q.id));
  const oldSent=quotes.filter(q=>q.status==='sent'&&daysBetween(q.created_at)>=7);
  const lowStock=inventory.filter(i=>i.quantity<=i.minimum_quantity);
  const incompleteB2B=clients.filter(c=>c.customer_type==='business'&&(!c.siren||!c.email||!c.address));
  const activeContracts=maintenanceContracts.filter(c=>c.active);
  const recurring=activeContracts.reduce((sum,c)=>sum+c.amount_ht*(c.frequency==='monthly'?12:c.frequency==='quarterly'?4:1),0);
  const paidRevenue=invoices.filter(i=>i.status==='paid').reduce((sum,i)=>sum+docTotal(i).ht,0);
  const expenses=businessExpenses.reduce((sum,e)=>sum+e.amount_ht,0);
  const completed=missions.filter(m=>m.status==='completed');
  const unbilledCompleted=completed.filter(m=>!invoices.some(i=>i.mission_id===m.id));
  const trackedHours=timeEntries.reduce((sum,e)=>sum+((new Date(e.ended_at??new Date().toISOString()).getTime()-new Date(e.started_at).getTime())/3600000),0);
  const score=Math.max(0,100-[overdue.length*8,accepted.length*4,oldSent.length*3,lowStock.length*2,incompleteB2B.length*3,unbilledCompleted.length*5].reduce((a,b)=>a+b,0));
  const recommendations=[
   overdue.length&&{level:'urgent',title:`Relancer ${overdue.length} facture${overdue.length>1?'s':''} en retard`,detail:`Montant restant estimé : ${money(overdue.reduce((s,i)=>s+docTotal(i).ttc-(i.payments??[]).reduce((a,p)=>a+p.amount,0),0))}`,to:'/follow-ups'},
   accepted.length&&{level:'high',title:`Facturer ${accepted.length} devis accepté${accepted.length>1?'s':''}`,detail:'Ces devis sont acceptés mais aucune facture liée n’a été créée.',to:'/assistant'},
   unbilledCompleted.length&&{level:'high',title:`Facturer ${unbilledCompleted.length} chantier${unbilledCompleted.length>1?'s':''} terminé${unbilledCompleted.length>1?'s':''}`,detail:'Des interventions terminées ne sont pas encore facturées.',to:'/missions'},
   oldSent.length&&{level:'medium',title:`Relancer ${oldSent.length} devis sans réponse`,detail:'Devis envoyés depuis au moins 7 jours.',to:'/follow-ups'},
   lowStock.length&&{level:'medium',title:`Réapprovisionner ${lowStock.length} article${lowStock.length>1?'s':''}`,detail:'Le stock est égal ou inférieur au seuil minimum.',to:'/inventory'},
   incompleteB2B.length&&{level:'medium',title:`Compléter ${incompleteB2B.length} fiche${incompleteB2B.length>1?'s':''} client B2B`,detail:'SIREN, adresse ou e-mail manquant pour la facturation électronique.',to:'/clients'},
   !company.siret&&{level:'urgent',title:'Renseigner le SIRET de l’entreprise',detail:'Information indispensable pour les documents commerciaux et la facturation électronique.',to:'/settings'},
  ].filter(Boolean) as {level:string;title:string;detail:string;to:string}[];
  return {unpaidTtc,overdue,accepted,oldSent,lowStock,incompleteB2B,recurring,paidRevenue,expenses,unbilledCompleted,trackedHours,score,recommendations};
 },[company,clients,missions,quotes,invoices,inventory,businessExpenses,maintenanceContracts,timeEntries]);
 function exportReport(){
  const lines=[['Indicateur','Valeur'],['Score de santé',`${analysis.score}/100`],['À encaisser',analysis.unpaidTtc.toFixed(2)],['CA HT encaissé',analysis.paidRevenue.toFixed(2)],['Dépenses HT',analysis.expenses.toFixed(2)],['Revenu récurrent annuel HT',analysis.recurring.toFixed(2)],['Heures suivies',analysis.trackedHours.toFixed(2)],['Factures en retard',String(analysis.overdue.length)],['Devis acceptés à facturer',String(analysis.accepted.length)],['Stocks faibles',String(analysis.lowStock.length)],[],['Recommandations','Détail'],...analysis.recommendations.map(r=>[r.title,r.detail])];
  const csv=lines.map(row=>row.map(cell=>`"${String(cell??'').replaceAll('"','""')}"`).join(';')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`closerflow-analyse-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
 }
 return <><div className="page-title"><div><p className="eyebrow">ASSISTANT PRO V8.1</p><h1>Analyse intelligente</h1><p className="muted">Diagnostic local de l’activité, sans envoyer tes données à un service externe.</p></div><button className="secondary" onClick={exportReport}><Download/>Exporter</button></div>
 <section className="insight-hero"><div className="health-ring"><strong>{analysis.score}</strong><span>/100</span></div><div><h2>{analysis.score>=85?'Entreprise bien tenue':analysis.score>=65?'Quelques actions prioritaires':'Actions urgentes détectées'}</h2><p>Le score repose sur les impayés, les devis en attente, la facturation des chantiers, le stock et les données obligatoires.</p></div></section>
 <div className="kpi-grid insight-kpis"><article><span>À encaisser</span><strong>{money(analysis.unpaidTtc)}</strong></article><article><span>CA HT encaissé</span><strong>{money(analysis.paidRevenue)}</strong></article><article><span>Dépenses HT</span><strong>{money(analysis.expenses)}</strong></article><article><span>Récurrent annuel HT</span><strong>{money(analysis.recurring)}</strong></article><article><span>Heures suivies</span><strong>{analysis.trackedHours.toFixed(1)} h</strong></article><article><span>Stocks faibles</span><strong>{analysis.lowStock.length}</strong></article></div>
 <section className="panel"><div className="panel-heading"><div><p className="eyebrow">PLAN D’ACTION</p><h2>Recommandations prioritaires</h2></div><BrainCircuit/></div><div className="recommendation-list">{analysis.recommendations.map((r,index)=><Link key={`${r.title}-${index}`} to={r.to} className={`recommendation ${r.level}`}><span>{r.level==='urgent'?<AlertTriangle/>:r.level==='high'?<TrendingUp/>:<Lightbulb/>}</span><div><strong>{r.title}</strong><small>{r.detail}</small></div><b>Ouvrir</b></Link>)}{!analysis.recommendations.length&&<div className="empty-state"><CheckCircle2/><strong>Aucune anomalie détectée</strong><span>Les principaux indicateurs sont à jour.</span></div>}</div></section>
 <section className="panel"><div className="panel-heading"><div><p className="eyebrow">CONTRÔLES</p><h2>Résumé des risques</h2></div></div><div className="risk-grid"><article><strong>{analysis.overdue.length}</strong><span>factures en retard</span></article><article><strong>{analysis.oldSent.length}</strong><span>devis à relancer</span></article><article><strong>{analysis.unbilledCompleted.length}</strong><span>chantiers terminés non facturés</span></article><article><strong>{analysis.incompleteB2B.length}</strong><span>clients B2B incomplets</span></article></div></section></>;
}
