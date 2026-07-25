import { Banknote, CalendarClock, Download, FileCheck2, TriangleAlert } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';
import { downloadCsv } from '../lib/export';

export function ReportsPage(){
 const {clients,missions,quotes,invoices}=useAppData();
 const paid=invoices.filter(i=>i.status==='paid');
 const receivable=invoices.filter(i=>i.status==='sent'||i.status==='overdue');
 const paidTotal=paid.reduce((s,i)=>s+totals(i.lines,i.discount_percent,i.vat_rate).ttc,0);
 const dueTotal=receivable.reduce((s,i)=>s+totals(i.lines,i.discount_percent,i.vat_rate).ttc,0);
 const overdueTotal=invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+totals(i.lines,i.discount_percent,i.vat_rate).ttc,0);
 const acceptedQuotes=quotes.filter(q=>q.status==='accepted').reduce((s,q)=>s+totals(q.lines,q.discount_percent,q.vat_rate).ttc,0);
 const exportInvoices=()=>downloadCsv(`closerflow-factures-${new Date().toISOString().slice(0,10)}.csv`,
  ['Numéro','Client','Objet','Statut','Date','Échéance','HT','TVA','TTC'],
  invoices.map(i=>{const c=clients.find(x=>x.id===i.client_id);const t=totals(i.lines,i.discount_percent,i.vat_rate);return [i.number,c?.company_name||`${c?.first_name??''} ${c?.last_name??''}`,i.title,i.status,new Date(i.created_at).toLocaleDateString('fr-FR'),i.due_date?new Date(i.due_date).toLocaleDateString('fr-FR'):'',t.ht,t.vat,t.ttc]}));
 const exportClients=()=>downloadCsv(`closerflow-clients-${new Date().toISOString().slice(0,10)}.csv`,
  ['Prénom','Nom','Entreprise','Téléphone','E-mail','Adresse','Notes'],
  clients.map(c=>[c.first_name,c.last_name,c.company_name,c.phone,c.email,c.address,c.notes]));
 return <><div className="section-heading"><div><p className="eyebrow">PILOTAGE</p><h1>Activité</h1></div></div>
 <section className="report-kpis">
  <article><Banknote/><span>Encaissé</span><strong>{money(paidTotal)}</strong><small>{paid.length} facture(s) payée(s)</small></article>
  <article><CalendarClock/><span>À encaisser</span><strong>{money(dueTotal)}</strong><small>{receivable.length} facture(s)</small></article>
  <article className={overdueTotal>0?'warning-kpi':''}><TriangleAlert/><span>En retard</span><strong>{money(overdueTotal)}</strong><small>À relancer rapidement</small></article>
  <article><FileCheck2/><span>Devis acceptés</span><strong>{money(acceptedQuotes)}</strong><small>À transformer en chantier</small></article>
 </section>
 <section className="detail-card"><h2>Vue d’ensemble</h2><div className="report-list"><div><span>Clients</span><b>{clients.length}</b></div><div><span>Missions actives</span><b>{missions.filter(m=>!['paid','archived'].includes(m.status)).length}</b></div><div><span>Devis en attente</span><b>{quotes.filter(q=>q.status==='sent').length}</b></div><div><span>Factures en retard</span><b>{invoices.filter(i=>i.status==='overdue').length}</b></div></div></section>
 <section className="detail-card"><h2>Exports comptables</h2><p className="muted-copy">Les fichiers CSV s’ouvrent dans Excel, Google Sheets ou LibreOffice.</p><div className="export-actions"><button className="primary" onClick={exportInvoices}><Download/>Exporter les factures</button><button className="ghost" onClick={exportClients}><Download/>Exporter les clients</button></div></section>
 </>;
}
