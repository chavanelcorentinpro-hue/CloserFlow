import { Bell, BellRing, CalendarClock, CircleAlert, FileClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const day = 86400000;
const money = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const invoiceTotal = (i:any) => i.lines.reduce((s:number,l:any)=>s+l.quantity*l.unit_price_ht,0)*(1-(i.discount_percent??0)/100)*(1+i.vat_rate/100);
const paidTotal = (i:any) => (i.payments??[]).reduce((s:number,p:any)=>s+p.amount,0);

export function AlertsPage(){
 const {missions,invoices,quotes,clients}=useAppData();
 const now=Date.now();
 const upcoming=missions.filter(m=>m.scheduled_start && new Date(m.scheduled_start).getTime()>=now && new Date(m.scheduled_start).getTime()<=now+2*day).sort((a,b)=>new Date(a.scheduled_start!).getTime()-new Date(b.scheduled_start!).getTime());
 const overdue=invoices.filter(i=>i.status!=='paid' && i.due_date && new Date(i.due_date).getTime()<now);
 const staleQuotes=quotes.filter(q=>q.status==='sent' && now-new Date(q.created_at).getTime()>7*day);
 const clientName=(id:string|null)=>{const c=clients.find(x=>x.id===id);return c?(c.company_name||`${c.first_name} ${c.last_name}`):'Client non renseigné'};
 const requestNotifications=async()=>{
  if(!('Notification' in window)){alert('Les notifications ne sont pas prises en charge sur cet appareil.');return}
  const permission=await Notification.requestPermission();
  if(permission==='granted') new Notification('CloserFlow',{body:`${upcoming.length} mission(s) proche(s), ${overdue.length} facture(s) échue(s).`});
 };
 return <>
  <div className="page-title"><div><p className="eyebrow">SUIVI</p><h1>Alertes</h1><p className="muted">Les éléments qui demandent votre attention.</p></div><button className="primary compact" onClick={requestNotifications}><BellRing/> Activer</button></div>
  <div className="alert-summary">
   <div className="stat-card"><CalendarClock/><strong>{upcoming.length}</strong><span>Missions sous 48 h</span></div>
   <div className="stat-card"><CircleAlert/><strong>{overdue.length}</strong><span>Factures échues</span></div>
   <div className="stat-card"><FileClock/><strong>{staleQuotes.length}</strong><span>Devis à relancer</span></div>
  </div>
  <section className="panel"><div className="section-heading"><h2>Interventions proches</h2><Bell/></div>{upcoming.length===0?<p className="empty">Aucune mission prévue dans les 48 prochaines heures.</p>:<div className="stack-list">{upcoming.map(m=><Link className="alert-row" to={`/missions/${m.id}`} key={m.id}><div><strong>{m.title}</strong><small>{new Date(m.scheduled_start!).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'})}</small></div><span>{clientName(m.client_id)}</span></Link>)}</div>}</section>
  <section className="panel"><div className="section-heading"><h2>Factures échues</h2><CircleAlert/></div>{overdue.length===0?<p className="empty">Aucune facture échue.</p>:<div className="stack-list">{overdue.map(i=>{const remaining=Math.max(0,invoiceTotal(i)-paidTotal(i));return <Link className="alert-row danger" to={`/invoices/${i.id}`} key={i.id}><div><strong>{i.number} · {i.title}</strong><small>Échéance {new Date(i.due_date!).toLocaleDateString('fr-FR')}</small></div><span>{money.format(remaining)}</span></Link>})}</div>}</section>
  <section className="panel"><div className="section-heading"><h2>Devis sans réponse depuis 7 jours</h2><FileClock/></div>{staleQuotes.length===0?<p className="empty">Aucun devis à relancer.</p>:<div className="stack-list">{staleQuotes.map(q=><Link className="alert-row" to={`/quotes/${q.id}`} key={q.id}><div><strong>{q.number} · {q.title}</strong><small>Envoyé le {new Date(q.created_at).toLocaleDateString('fr-FR')}</small></div><span>{clientName(q.client_id)}</span></Link>)}</div>}</section>
 </>;
}
