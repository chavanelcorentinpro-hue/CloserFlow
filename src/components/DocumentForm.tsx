import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { money, totals } from '../lib/documents';
import type { DocumentLine } from '../types/domain';
import { createId } from '../lib/id';

export interface DocumentFormValue {
 client_id:string|null; title:string; vat_rate:number; discount_percent:number; lines:DocumentLine[];
}
export function DocumentForm({clients,submitLabel,onSubmit,onCancel}:{clients:{id:string;label:string}[];submitLabel:string;onSubmit:(value:DocumentFormValue)=>void;onCancel:()=>void}){
 const [clientId,setClientId]=useState(''); const [title,setTitle]=useState(''); const [vat,setVat]=useState(10); const [discount,setDiscount]=useState(0);
 const [lines,setLines]=useState<DocumentLine[]>([{id:createId(),description:'',quantity:1,unit:'forfait',unit_price_ht:0}]);
 const total=totals(lines,discount,vat);
 const update=(id:string,key:keyof DocumentLine,value:string|number)=>setLines(rows=>rows.map(line=>line.id===id?{...line,[key]:value}:line));
 const submit=(event:FormEvent)=>{event.preventDefault();if(lines.some(line=>!line.description.trim()))return;onSubmit({client_id:clientId||null,title,vat_rate:vat,discount_percent:discount,lines});};
 return <form className="form-card document-form" onSubmit={submit}>
  <label>Client<select value={clientId} onChange={e=>setClientId(e.target.value)} required><option value="">Sélectionner</option>{clients.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
  <label>Objet<input value={title} onChange={e=>setTitle(e.target.value)} required/></label>
  <div className="document-lines"><div className="line-head"><strong>Lignes</strong><button type="button" className="ghost small" onClick={()=>setLines(x=>[...x,{id:createId(),description:'',quantity:1,unit:'u',unit_price_ht:0}])}><Plus/>Ajouter</button></div>
   {lines.map((line,index)=><div className="document-line" key={line.id}>
    <label className="line-description">Description<input value={line.description} onChange={e=>update(line.id,'description',e.target.value)} required/></label>
    <label>Qté<input type="number" min="0" step="0.01" value={line.quantity} onChange={e=>update(line.id,'quantity',Number(e.target.value))}/></label>
    <label>Unité<input value={line.unit} onChange={e=>update(line.id,'unit',e.target.value)}/></label>
    <label>Prix HT<input type="number" min="0" step="0.01" value={line.unit_price_ht} onChange={e=>update(line.id,'unit_price_ht',Number(e.target.value))}/></label>
    <button type="button" className="danger icon-only" disabled={lines.length===1} onClick={()=>setLines(x=>x.filter(v=>v.id!==line.id))} aria-label={`Supprimer ligne ${index+1}`}><Trash2/></button>
   </div>)}
  </div>
  <div className="two-cols"><label>Remise (%)<input type="number" min="0" max="100" step="0.1" value={discount} onChange={e=>setDiscount(Number(e.target.value))}/></label><label>TVA<select value={vat} onChange={e=>setVat(Number(e.target.value))}><option value="0">0 %</option><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option></select></label></div>
  <div className="document-total"><span>Total HT <b>{money(total.ht)}</b></span><span>TVA <b>{money(total.vat)}</b></span><strong>Total TTC {money(total.ttc)}</strong></div>
  <div className="form-actions"><button type="button" className="ghost" onClick={onCancel}>Annuler</button><button className="primary">{submitLabel}</button></div>
 </form>;
}
