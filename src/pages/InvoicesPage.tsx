import { useEffect, useState } from 'react';
import { Printer, Receipt, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentForm } from '../components/DocumentForm';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';
import type { InvoiceStatus } from '../types/domain';
const labels:Record<InvoiceStatus,string>={draft:'Brouillon',sent:'Envoyée',overdue:'En retard',partial:'Partiellement payée',paid:'Payée'};
export function InvoicesPage(){
 const {invoices,clients,addInvoice,updateInvoiceStatus,deleteInvoice}=useAppData(); const [open,setOpen]=useState(false); const navigate=useNavigate();
 useEffect(()=>{invoices.forEach(i=>{if(i.status!=='paid'&&i.status!=='partial'&&i.due_date&&new Date(i.due_date).getTime()<Date.now()&&i.status!=='overdue')updateInvoiceStatus(i.id,'overdue')})},[invoices,updateInvoiceStatus]);
 const clientOptions=clients.map(c=>({id:c.id,label:c.company_name||`${c.first_name} ${c.last_name}`}));
 return <><div className="page-title section-heading"><div><p className="eyebrow">FINANCES</p><h1>Factures</h1></div><button className="primary" onClick={()=>setOpen(!open)}>+ Nouvelle</button></div>
 {open&&<DocumentForm clients={clientOptions} submitLabel="Créer la facture" onCancel={()=>setOpen(false)} onSubmit={value=>{addInvoice({...value,mission_id:null,quote_id:null,status:'draft',due_date:new Date(Date.now()+30*86400000).toISOString().slice(0,10)});setOpen(false)}}/>}
 <div className="stack">{invoices.map(i=>{const c=clients.find(x=>x.id===i.client_id);const t=totals(i.lines,i.discount_percent,i.vat_rate);const paid=(i.payments??[]).reduce((sum,p)=>sum+p.amount,0);const remaining=Math.max(0,t.ttc-paid);return <article className="list-card document-card" key={i.id}>
  <div className="document-card-main"><div className="document-icon"><Receipt/></div><div><strong>{i.number}</strong><span>{c?.company_name||`${c?.first_name??''} ${c?.last_name??''}`}</span><small>{i.title}{i.due_date?` · Échéance ${new Date(i.due_date).toLocaleDateString('fr-FR')}`:''}</small>{paid>0&&<small>Réglé {money(paid)} · Reste {money(remaining)}</small>}</div></div>
  <b>{money(t.ttc)} TTC</b>
  <select value={i.status} onChange={e=>updateInvoiceStatus(i.id,e.target.value as InvoiceStatus)}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
  <div className="row-actions"><button className="ghost small" onClick={()=>navigate(`/invoices/${i.id}`)}><Printer/>Ouvrir</button><button className="danger icon-only" onClick={()=>confirm('Supprimer cette facture ?')&&deleteInvoice(i.id)}><Trash2/></button></div>
 </article>})}</div></>;
}
