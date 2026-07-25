import { ArrowRight, Banknote, BellRing, FileText, Plus, Search, Sparkles, TriangleAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MissionCard } from '../components/MissionCard';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';

export function DashboardPage(){
 const {company,missions,quotes,invoices}=useAppData(); const nav=useNavigate();
 const today=missions.filter(m=>m.scheduled_start&&new Date(m.scheduled_start).toDateString()===new Date().toDateString());
 const active=missions.find(m=>m.status==='in_progress');
 const now=Date.now(); const upcoming=missions.filter(m=>m.scheduled_start&&+new Date(m.scheduled_start)>now&&+new Date(m.scheduled_start)<=now+24*60*60*1000).sort((a,b)=>+new Date(a.scheduled_start!)-+new Date(b.scheduled_start!));
 const quoteCount=quotes.filter(q=>q.status==='draft'||q.status==='sent').length;
 const overdue=invoices.filter(i=>i.status==='overdue');
 const overdueAmount=overdue.reduce((sum,i)=>{const total=totals(i.lines,i.discount_percent,i.vat_rate).ttc;const paid=(i.payments??[]).reduce((value,p)=>value+p.amount,0);return sum+Math.max(0,total-paid)},0);
 const month=new Date().getMonth(),year=new Date().getFullYear();
 const collected=invoices.reduce((sum,i)=>sum+(i.payments??[]).filter(p=>{const date=new Date(p.paid_at);return date.getMonth()===month&&date.getFullYear()===year}).reduce((value,p)=>value+p.amount,0),0);
 return <><section className="hero"><div><p className="eyebrow">Aujourd’hui</p><h1>{company.name==='Mon entreprise'?'Bonjour 👋':company.name}</h1><p>Voici ce qui mérite votre attention.</p></div><Link className="dashboard-search" to="/search"><Search/>Rechercher</Link></section>
 <section className="metric-grid"><article><span>Missions</span><strong>{today.length}</strong><small>aujourd’hui</small></article><article><span>Devis</span><strong>{quoteCount}</strong><small>à traiter</small></article><article className={overdue.length?'metric-warning':''}><span>Impayés</span><strong>{money(overdueAmount)}</strong><small>{overdue.length} à relancer</small></article><article><span>Encaissé</span><strong>{money(collected)}</strong><small>ce mois-ci</small></article></section>
 {upcoming.length>0&&<Link className="alert-card upcoming-alert" to="/planning"><BellRing/><div><strong>Prochaine mission dans moins de 24 h</strong><span>{upcoming[0].title} · {new Date(upcoming[0].scheduled_start!).toLocaleString('fr-FR',{weekday:'short',hour:'2-digit',minute:'2-digit'})}</span></div><ArrowRight/></Link>}
 {overdue.length>0&&<Link className="alert-card" to="/invoices"><TriangleAlert/><div><strong>{overdue.length} facture(s) en retard</strong><span>{money(overdueAmount)} restent à encaisser</span></div><ArrowRight/></Link>}
 {active&&<section className="resume-card"><div><Sparkles size={20}/><div><span>Chantier en cours</span><strong>{active.title}</strong></div></div><Link to={`/missions/${active.id}`}>Reprendre <ArrowRight size={18}/></Link></section>}
 <div className="section-heading"><div><p className="eyebrow">Planning</p><h2>Missions du jour</h2></div><Link className="icon-link" to="/missions/new"><Plus/>Créer</Link></div>
 <div className="stack">{today.length?today.map(m=><MissionCard key={m.id} mission={m}/>):<div className="empty-card">Aucune mission aujourd’hui.</div>}</div>
 <section className="quick-grid"><button onClick={()=>nav('/quotes')}><FileText/><span>Nouveau devis</span></button><button onClick={()=>nav('/invoices')}><Banknote/><span>Nouvelle facture</span></button></section></>;
}
