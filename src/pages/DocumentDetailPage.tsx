import { useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, Printer, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';
import type { InvoicePayment } from '../types/domain';

const paymentLabels:Record<InvoicePayment['method'],string>={card:'Carte',transfer:'Virement',cash:'Espèces',check:'Chèque',other:'Autre'};
export function DocumentDetailPage({kind}:{kind:'quote'|'invoice'}){
 const {id}=useParams(); const {company,clients,quotes,invoices,addInvoicePayment,removeInvoicePayment}=useAppData();
 const doc=kind==='quote'?quotes.find(x=>x.id===id):invoices.find(x=>x.id===id);
 const [amount,setAmount]=useState(''); const [method,setMethod]=useState<InvoicePayment['method']>('transfer'); const [note,setNote]=useState('');
 if(!doc)return <div className="empty-state">Document introuvable.</div>;
 const client=clients.find(c=>c.id===doc.client_id); const t=totals(doc.lines,doc.discount_percent,doc.vat_rate);
 const isInvoice=kind==='invoice'; const back=isInvoice?'/invoices':'/quotes';
 const payments=isInvoice&&'payments' in doc?(doc.payments??[]):[]; const paid=payments.reduce((sum,p)=>sum+p.amount,0); const remaining=Math.max(0,t.ttc-paid);
 const submitPayment=(e:FormEvent)=>{e.preventDefault();const value=Number(amount);if(!isInvoice||!Number.isFinite(value)||value<=0)return;addInvoicePayment(doc.id,{amount:Math.min(value,remaining),method,note,paid_at:new Date().toISOString()});setAmount('');setNote('')};
 return <div className="print-page"><div className="no-print document-toolbar"><Link className="ghost" to={back}><ArrowLeft/>Retour</Link><button className="primary" onClick={()=>window.print()}><Printer/>Imprimer / PDF</button></div>
  <header className="document-header"><div><h1>{isInvoice?'FACTURE':'DEVIS'}</h1><strong>{doc.number}</strong></div><div className="company-block"><h2>{company.name}</h2><p>{company.address}</p><p>{company.phone} {company.email}</p><p>SIRET : {company.siret||'—'}</p><p>TVA : {company.vat_number||'—'}</p></div></header>
  <section className="document-meta"><div><span>Client</span><strong>{client?.company_name||`${client?.first_name??''} ${client?.last_name??''}`}</strong><p>{client?.address||''}</p><p>{client?.email||''} {client?.phone||''}</p></div><div><span>Date</span><strong>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</strong>{isInvoice&&'due_date' in doc&&doc.due_date&&<><span>Échéance</span><strong>{new Date(doc.due_date).toLocaleDateString('fr-FR')}</strong></>}</div></section>
  <h2 className="document-title">{doc.title}</h2>
  <table className="document-table"><thead><tr><th>Description</th><th>Qté</th><th>Unité</th><th>Prix HT</th><th>Total HT</th></tr></thead><tbody>{doc.lines.map(line=><tr key={line.id}><td>{line.description}</td><td>{line.quantity}</td><td>{line.unit}</td><td>{money(line.unit_price_ht)}</td><td>{money(line.quantity*line.unit_price_ht)}</td></tr>)}</tbody></table>
  <div className="document-summary"><div><span>Sous-total</span><b>{money(t.base)}</b></div>{doc.discount_percent>0&&<div><span>Remise ({doc.discount_percent} %)</span><b>- {money(t.discount)}</b></div>}<div><span>Total HT</span><b>{money(t.ht)}</b></div><div><span>TVA ({doc.vat_rate} %)</span><b>{money(t.vat)}</b></div><div className="grand-total"><span>Total TTC</span><b>{money(t.ttc)}</b></div>{isInvoice&&paid>0&&<><div><span>Déjà réglé</span><b>- {money(paid)}</b></div><div className="grand-total"><span>Reste à payer</span><b>{money(remaining)}</b></div></>}</div>
  {isInvoice&&<section className="no-print payment-panel"><div className="section-heading"><div><p className="eyebrow">ENCAISSEMENTS</p><h2>Paiements</h2></div><b>{money(paid)} / {money(t.ttc)}</b></div>
   {payments.length>0?<div className="payment-list">{payments.map(p=><div className="payment-row" key={p.id}><div><strong>{money(p.amount)} · {paymentLabels[p.method]}</strong><small>{new Date(p.paid_at).toLocaleDateString('fr-FR')}{p.note?` · ${p.note}`:''}</small></div><button className="danger icon-only" onClick={()=>confirm('Supprimer ce paiement ?')&&removeInvoicePayment(doc.id,p.id)}><Trash2/></button></div>)}</div>:<p className="muted">Aucun paiement enregistré.</p>}
   {remaining>0&&<form className="payment-form" onSubmit={submitPayment}><label>Montant<input type="number" min="0.01" max={remaining} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={remaining.toFixed(2)} required/></label><label>Moyen<select value={method} onChange={e=>setMethod(e.target.value as InvoicePayment['method'])}>{Object.entries(paymentLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="payment-note">Note<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Acompte, référence…"/></label><button className="primary"><Plus/>Enregistrer</button></form>}
  </section>}
  <footer className="document-footer">{isInvoice?<p>Merci pour votre confiance.</p>:<p>Devis valable 30 jours. Bon pour accord, date et signature.</p>}</footer>
 </div>;
}
