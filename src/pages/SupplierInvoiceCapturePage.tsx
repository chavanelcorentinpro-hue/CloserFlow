import { useMemo, useRef, useState } from 'react';
import { Camera, FileText, PlusCircle, ScanText, Trash2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { createId } from '../lib/id';

type Draft = {
  id:string; supplier:string; invoiceNumber:string; invoiceDate:string;
  amountHt:number; vatRate:number; amountTtc:number; rawText:string;
  imageDataUrl:string; createdAt:string; imported:boolean;
};

const KEY='closerflow_supplier_invoice_inbox_v84';
function load():Draft[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]') as Draft[]}catch{return []}}
function save(rows:Draft[]){localStorage.setItem(KEY,JSON.stringify(rows))}
function money(value:string){const n=Number(value.replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0}
function extract(text:string){
  const clean=text.replace(/\r/g,'');
  const lines=clean.split('\n').map(x=>x.trim()).filter(Boolean);
  const supplier=lines.find(x=>x.length>2&&!/facture|invoice|total|tva|date|siret/i.test(x))||'';
  const invoiceNumber=(clean.match(/(?:facture|invoice|n[°o]|num[eé]ro)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/_-]{2,})/i)||[])[1]||'';
  const date=(clean.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)||clean.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/));
  let invoiceDate=new Date().toISOString().slice(0,10);
  if(date){invoiceDate=date[1].length===4?`${date[1]}-${date[2].padStart(2,'0')}-${date[3].padStart(2,'0')}`:`${date[3]}-${date[2].padStart(2,'0')}-${date[1].padStart(2,'0')}`}
  const ttc=money((clean.match(/(?:total\s*ttc|net\s*[àa]\s*payer|amount\s*due)\s*[:€ ]*([0-9][0-9\s.,]*)/i)||[])[1]||'0');
  const ht=money((clean.match(/(?:total\s*ht|montant\s*ht)\s*[:€ ]*([0-9][0-9\s.,]*)/i)||[])[1]||'0');
  const vat=money((clean.match(/(?:tva|vat)\s*(?:\(|à)?\s*([0-9]{1,2}(?:[.,][0-9]+)?)\s*%/i)||[])[1]||'20');
  const amountHt=ht|| (ttc?ttc/(1+vat/100):0);
  const amountTtc=ttc||amountHt*(1+vat/100);
  return {supplier,invoiceNumber,invoiceDate,amountHt:Number(amountHt.toFixed(2)),vatRate:vat||20,amountTtc:Number(amountTtc.toFixed(2))};
}

export function SupplierInvoiceCapturePage(){
  const {addBusinessExpense}=useAppData();
  const [rows,setRows]=useState<Draft[]>(load);
  const [rawText,setRawText]=useState('');
  const [imageDataUrl,setImageDataUrl]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  const parsed=useMemo(()=>extract(rawText),[rawText]);
  function persist(next:Draft[]){setRows(next);save(next)}
  function onFile(file?:File){if(!file)return;const reader=new FileReader();reader.onload=()=>setImageDataUrl(String(reader.result||''));reader.readAsDataURL(file)}
  function addDraft(){const row:Draft={id:createId(),...parsed,rawText,imageDataUrl,createdAt:new Date().toISOString(),imported:false};persist([row,...rows]);setRawText('');setImageDataUrl('')}
  function importExpense(row:Draft){addBusinessExpense({label:`Facture ${row.invoiceNumber||row.supplier||'fournisseur'}`,supplier:row.supplier||'Fournisseur à compléter',category:'materials',amount_ht:row.amountHt,vat_rate:row.vatRate,expense_date:row.invoiceDate,mission_id:null,paid:false});persist(rows.map(x=>x.id===row.id?{...x,imported:true}:x))}
  return <>
    <div className="page-title"><div><p className="eyebrow">ACHATS</p><h1>Capture facture fournisseur</h1><p className="muted">Photo + extraction locale à partir du texte copié depuis Android, Google Lens ou un PDF.</p></div></div>
    <div className="split-grid">
      <section className="panel">
        <h2><ScanText size={20}/> Nouvelle capture</h2>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e=>onFile(e.target.files?.[0])}/>
        <button className="secondary-button" onClick={()=>fileRef.current?.click()}><Camera size={18}/> Photographier / choisir une image</button>
        {imageDataUrl&&<img src={imageDataUrl} alt="Facture fournisseur" style={{width:'100%',maxHeight:260,objectFit:'contain',marginTop:12,borderRadius:12}}/>}
        <label>Texte reconnu ou copié<textarea rows={10} value={rawText} onChange={e=>setRawText(e.target.value)} placeholder={'COLAS MATERIAUX\nFacture FA-2026-0187\nDate 21/07/2026\nTotal HT 125,00 €\nTVA 20 %\nTotal TTC 150,00 €'}/></label>
        <div className="kpi-grid compact">
          <div className="kpi-card"><small>Fournisseur</small><strong>{parsed.supplier||'À détecter'}</strong></div>
          <div className="kpi-card"><small>N° facture</small><strong>{parsed.invoiceNumber||'À détecter'}</strong></div>
          <div className="kpi-card"><small>Total HT</small><strong>{parsed.amountHt.toFixed(2)} €</strong></div>
          <div className="kpi-card"><small>Total TTC</small><strong>{parsed.amountTtc.toFixed(2)} €</strong></div>
        </div>
        <button className="primary-button" disabled={!rawText.trim()} onClick={addDraft}><PlusCircle size={18}/> Ajouter à la boîte de réception</button>
      </section>
      <section className="panel">
        <h2><FileText size={20}/> Boîte de réception ({rows.length})</h2>
        {!rows.length&&<p className="empty-state">Aucune facture capturée.</p>}
        <div className="stack-list">{rows.map(row=><article className="list-card" key={row.id}>
          <div><strong>{row.supplier||'Fournisseur à compléter'}</strong><small>{row.invoiceNumber||'Sans numéro'} · {row.invoiceDate}</small><p>{row.amountHt.toFixed(2)} € HT · TVA {row.vatRate}% · {row.amountTtc.toFixed(2)} € TTC</p></div>
          <div className="inline-actions">
            <button className="secondary-button" disabled={row.imported} onClick={()=>importExpense(row)}>{row.imported?'Dépense créée':'Créer la dépense'}</button>
            <button className="icon-button danger" aria-label="Supprimer" onClick={()=>persist(rows.filter(x=>x.id!==row.id))}><Trash2 size={17}/></button>
          </div>
        </article>)}</div>
      </section>
    </div>
  </>
}
