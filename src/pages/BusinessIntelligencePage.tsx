import { useMemo, useState } from 'react';
import { BarChart3, BriefcaseBusiness, CircleDollarSign, Download, Gauge, TrendingUp, UsersRound, WalletCards } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { totals } from '../lib/documents';

const euros=(value:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value||0);
const pct=(value:number)=>`${Math.round(value||0)} %`;
const monthKey=(iso:string)=>iso.slice(0,7);
const monthLabel=(key:string)=>new Date(`${key}-01T12:00:00`).toLocaleDateString('fr-FR',{month:'short',year:'2-digit'});
const download=(name:string,content:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();URL.revokeObjectURL(a.href)};

export function BusinessIntelligencePage(){
 const {clients,missions,quotes,invoices,timeEntries,businessExpenses,maintenanceContracts}=useAppData();
 const [months,setMonths]=useState(6);
 const model=useMemo(()=>{
  const now=new Date(); const keys:string[]=[];
  for(let i=months-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}
  const invoiceAmount=(invoice:typeof invoices[number])=>totals(invoice.lines,invoice.discount_percent,invoice.vat_rate).ht;
  const paidAmount=(invoice:typeof invoices[number])=>Math.min(invoiceAmount(invoice),(invoice.payments||[]).reduce((s,p)=>s+p.amount/(1+invoice.vat_rate/100),0));
  const revenue=invoices.reduce((s,i)=>s+invoiceAmount(i),0);
  const collected=invoices.reduce((s,i)=>s+paidAmount(i),0);
  const expenses=businessExpenses.reduce((s,e)=>s+e.amount_ht,0);
  const labour=timeEntries.reduce((s,e)=>{const end=e.ended_at?new Date(e.ended_at).getTime():Date.now();return s+Math.max(0,end-new Date(e.started_at).getTime())/3600000*e.hourly_cost},0);
  const grossMargin=revenue-expenses-labour;
  const sent=quotes.filter(q=>q.status!=='draft'); const accepted=sent.filter(q=>q.status==='accepted');
  const monthly=keys.map(key=>({key,revenue:invoices.filter(i=>monthKey(i.created_at)===key).reduce((s,i)=>s+invoiceAmount(i),0),expenses:businessExpenses.filter(e=>monthKey(e.expense_date||e.created_at)===key).reduce((s,e)=>s+e.amount_ht,0)}));
  const byClient=clients.map(c=>{const value=invoices.filter(i=>i.client_id===c.id).reduce((s,i)=>s+invoiceAmount(i),0);return{name:c.company_name||`${c.first_name} ${c.last_name}`.trim()||'Client',value}}).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,5);
  const missionRows=missions.map(m=>{const billed=invoices.filter(i=>i.mission_id===m.id).reduce((s,i)=>s+invoiceAmount(i),0);const direct=(m.expenses||[]).reduce((s,e)=>s+e.amount,0)+businessExpenses.filter(e=>e.mission_id===m.id).reduce((s,e)=>s+e.amount_ht,0);const labourCost=timeEntries.filter(e=>e.mission_id===m.id).reduce((s,e)=>{const end=e.ended_at?new Date(e.ended_at).getTime():Date.now();return s+Math.max(0,end-new Date(e.started_at).getTime())/3600000*e.hourly_cost},0);return{id:m.id,title:m.title,billed,cost:direct+labourCost,margin:billed-direct-labourCost}}).filter(x=>x.billed||x.cost).sort((a,b)=>b.margin-a.margin);
  return{revenue,collected,expenses,labour,grossMargin,marginRate:revenue?grossMargin/revenue*100:0,conversion:sent.length?accepted.length/sent.length*100:0,activeContracts:maintenanceContracts.filter(c=>c.active).reduce((s,c)=>s+c.amount_ht*(c.frequency==='monthly'?12:c.frequency==='quarterly'?4:1),0),monthly,byClient,missionRows};
 },[clients,missions,quotes,invoices,timeEntries,businessExpenses,maintenanceContracts,months]);
 const maxMonthly=Math.max(1,...model.monthly.flatMap(x=>[x.revenue,x.expenses]));
 const exportCsv=()=>download('closerflow-bi.csv',['Indicateur;Valeur',`Chiffre d'affaires HT;${model.revenue.toFixed(2)}`,`Encaissements HT;${model.collected.toFixed(2)}`,`Dépenses HT;${model.expenses.toFixed(2)}`,`Coût main-d'œuvre;${model.labour.toFixed(2)}`,`Marge estimée;${model.grossMargin.toFixed(2)}`,`Taux de marge;${model.marginRate.toFixed(1)}%`,'', 'Chantier;Facturé HT;Coûts;Marge',...model.missionRows.map(x=>`${x.title.replaceAll(';',',')};${x.billed.toFixed(2)};${x.cost.toFixed(2)};${x.margin.toFixed(2)}`)].join('\n'));
 return <>
  <div className="page-title"><div><p className="eyebrow">BUSINESS INTELLIGENCE</p><h1>Pilotage dirigeant v10.5</h1><p className="muted">Rentabilité, clients, conversion et évolution financière réunis dans une vue.</p></div><div className="bi-actions"><select value={months} onChange={e=>setMonths(Number(e.target.value))}><option value={3}>3 mois</option><option value={6}>6 mois</option><option value={12}>12 mois</option></select><button className="secondary" onClick={exportCsv}><Download/>Exporter</button></div></div>
  <section className="bi-kpis"><article><CircleDollarSign/><span>CA facturé HT</span><strong>{euros(model.revenue)}</strong><small>{euros(model.collected)} encaissés</small></article><article><TrendingUp/><span>Marge estimée</span><strong>{euros(model.grossMargin)}</strong><small>{pct(model.marginRate)} du CA</small></article><article><WalletCards/><span>Charges suivies</span><strong>{euros(model.expenses+model.labour)}</strong><small>{euros(model.labour)} de main-d’œuvre</small></article><article><Gauge/><span>Conversion devis</span><strong>{pct(model.conversion)}</strong><small>{euros(model.activeContracts)} de récurrent annuel</small></article></section>
  <div className="bi-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">ÉVOLUTION</p><h2>CA et dépenses HT</h2></div><BarChart3/></div><div className="bi-chart">{model.monthly.map(row=><div className="bi-month" key={row.key}><div className="bi-bars"><i className="revenue" style={{height:`${Math.max(3,row.revenue/maxMonthly*100)}%`}} title={`CA ${euros(row.revenue)}`}/><i className="expense" style={{height:`${Math.max(3,row.expenses/maxMonthly*100)}%`}} title={`Dépenses ${euros(row.expenses)}`}/></div><strong>{monthLabel(row.key)}</strong><small>{euros(row.revenue)}</small></div>)}</div><div className="bi-legend"><span><i className="revenue"/>CA</span><span><i className="expense"/>Dépenses</span></div></section>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">CLIENTS</p><h2>Principaux clients</h2></div><UsersRound/></div><div className="bi-ranking">{model.byClient.length?model.byClient.map((row,index)=><article key={row.name}><b>{index+1}</b><div><strong>{row.name}</strong><span style={{width:`${Math.max(6,row.value/(model.byClient[0]?.value||1)*100)}%`}}/></div><em>{euros(row.value)}</em></article>):<p className="muted">Aucune facture client pour le moment.</p>}</div></section></div>
  <section className="panel"><div className="panel-heading"><div><p className="eyebrow">CHANTIERS</p><h2>Rentabilité par chantier</h2></div><BriefcaseBusiness/></div><div className="bi-table"><header><span>Chantier</span><span>Facturé</span><span>Coûts</span><span>Marge</span></header>{model.missionRows.slice(0,12).map(row=><article key={row.id}><strong>{row.title}</strong><span>{euros(row.billed)}</span><span>{euros(row.cost)}</span><b className={row.margin<0?'negative':'positive'}>{euros(row.margin)}</b></article>)}{!model.missionRows.length&&<p className="muted">Ajoute des factures, dépenses ou heures pour calculer la rentabilité.</p>}</div></section>
 </>;
}
