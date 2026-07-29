import { useState } from 'react';
import { FileText, Pencil, Printer, Receipt, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentForm } from '../components/DocumentForm';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';
import type { QuoteStatus } from '../types/domain';
const labels:Record<QuoteStatus,string>={draft:'Brouillon',sent:'Envoyé',accepted:'Accepté',rejected:'Refusé'};
export function QuotesPage(){
 const {quotes,clients,addQuote,updateQuote,updateQuoteStatus,deleteQuote,convertQuoteToInvoice}=useAppData();
 const [open,setOpen]=useState(false); const [editingId,setEditingId]=useState<string|null>(null); const navigate=useNavigate();
 const clientOptions=clients.map(c=>({id:c.id,label:c.company_name||`${c.first_name} ${c.last_name}`}));
 const convert=(id:string)=>{const due=new Date(Date.now()+30*86400000).toISOString().slice(0,10);const invoice=convertQuoteToInvoice(id,due);navigate(`/invoices/${invoice.id}`)};
 return <><div className="page-title section-heading"><div><p className="eyebrow">VENTES</p><h1>Devis</h1></div><button className="primary" onClick={()=>setOpen(!open)}>+ Nouveau</button></div>
 {open&&<DocumentForm clients={clientOptions} submitLabel="Créer le devis" onCancel={()=>setOpen(false)} onSubmit={value=>{addQuote({...value,mission_id:null,status:'draft'});setOpen(false)}}/>}
 {editingId&&(()=>{const q=quotes.find(x=>x.id===editingId);return q?<DocumentForm clients={clientOptions} submitLabel="Enregistrer les modifications" initialValue={{client_id:q.client_id,title:q.title,vat_rate:q.vat_rate,discount_percent:q.discount_percent,lines:q.lines}} onCancel={()=>setEditingId(null)} onSubmit={value=>{updateQuote(q.id,value,'Édition manuelle');setEditingId(null)}}/>:null})()}
 <div className="stack">{quotes.map(q=>{const c=clients.find(x=>x.id===q.client_id);const t=totals(q.lines,q.discount_percent,q.vat_rate);return <article className="list-card document-card" key={q.id}>
  <div className="document-card-main"><div className="document-icon"><FileText/></div><div><strong>{q.number}</strong><span>{c?.company_name||`${c?.first_name??''} ${c?.last_name??''}`}</span><small>{q.title} · {q.lines.length} ligne(s)</small></div></div>
  <b>{money(t.ttc)} TTC</b>
  <select value={q.status} onChange={e=>updateQuoteStatus(q.id,e.target.value as QuoteStatus)}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
  <div className="row-actions"><button className="ghost small" onClick={()=>setEditingId(q.id)}><Pencil/>Modifier</button><button className="ghost small" onClick={()=>navigate(`/quotes/${q.id}`)}><Printer/>Ouvrir</button><button className="primary small" onClick={()=>convert(q.id)}><Receipt/>Facturer</button><button className="danger icon-only" onClick={()=>confirm('Supprimer ce devis ?')&&deleteQuote(q.id)}><Trash2/></button></div>
 </article>})}</div></>;
}
