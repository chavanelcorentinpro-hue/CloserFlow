import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Landmark, Link2, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { money } from '../lib/documents';
import { createId } from '../lib/id';

type BankTransaction={id:string;date:string;label:string;amount:number;reference:string;matchedType:'invoice'|'expense'|null;matchedId:string|null;importedAt:string};
const STORAGE_KEY='closerflow.bankTransactions.v8_5';
const readRows=():BankTransaction[]=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}};
const saveRows=(rows:BankTransaction[])=>localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));
const normalize=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const parseAmount=(value:string)=>Number(value.replace(/\s/g,'').replace(',','.').replace(/[^0-9.-]/g,''));
const invoiceTotal=(invoice:any)=>invoice.lines.reduce((sum:number,line:any)=>sum+line.quantity*line.unit_price_ht,0)*(1-(invoice.discount_percent??0)/100)*(1+invoice.vat_rate/100);

function detectSeparator(line:string){return [';',',','\t'].sort((a,b)=>line.split(b).length-line.split(a).length)[0]}
function parseCsv(text:string):BankTransaction[]{
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean); if(lines.length<2)return [];
 const sep=detectSeparator(lines[0]); const split=(line:string)=>line.split(sep).map(x=>x.trim().replace(/^"|"$/g,''));
 const headers=split(lines[0]).map(normalize);
 const find=(terms:string[])=>headers.findIndex(h=>terms.some(t=>h.includes(t)));
 const dateIndex=find(['date','operation']); const labelIndex=find(['libelle','label','description','intitule']); const amountIndex=find(['montant','amount']); const debitIndex=find(['debit']); const creditIndex=find(['credit']); const refIndex=find(['reference','ref']);
 return lines.slice(1).map(line=>{const cells=split(line); const debit=debitIndex>=0?parseAmount(cells[debitIndex]||'0'):0; const credit=creditIndex>=0?parseAmount(cells[creditIndex]||'0'):0; const amount=amountIndex>=0?parseAmount(cells[amountIndex]||'0'):credit-Math.abs(debit); const rawDate=cells[dateIndex]||new Date().toISOString().slice(0,10); const parts=rawDate.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/); const date=parts?`${parts[3]}-${parts[2]}-${parts[1]}`:rawDate.slice(0,10); return {id:createId(),date,label:cells[labelIndex]||'Opération bancaire',amount,reference:cells[refIndex]||'',matchedType:null,matchedId:null,importedAt:new Date().toISOString()}}).filter(x=>Number.isFinite(x.amount)&&x.amount!==0);
}

export function BankReconciliationPage(){
 const {invoices,clients,businessExpenses,addInvoicePayment,toggleBusinessExpensePaid}=useAppData();
 const [rows,setRows]=useState<BankTransaction[]>(readRows); const [query,setQuery]=useState(''); const inputRef=useRef<HTMLInputElement>(null);
 const persist=(next:BankTransaction[])=>{setRows(next);saveRows(next)};
 const onFile=async(file?:File)=>{if(!file)return;const parsed=parseCsv(await file.text());persist([...parsed,...rows]);if(inputRef.current)inputRef.current.value=''};
 const suggestions=useMemo(()=>rows.map(row=>{
  if(row.matchedId)return {row,kind:null as null|'invoice'|'expense',id:null as string|null,score:0,title:''};
  if(row.amount>0){let best:any=null;for(const invoice of invoices){if(invoice.status==='paid')continue;const total=invoiceTotal(invoice);const client=clients.find(c=>c.id===invoice.client_id);const amountScore=Math.max(0,100-Math.abs(total-row.amount)*3);const text=normalize(`${row.label} ${row.reference}`);const nameScore=client&&text.includes(normalize(`${client.first_name} ${client.last_name}`.trim()))?35:0;const numberScore=text.includes(normalize(invoice.number))?55:0;const score=amountScore+nameScore+numberScore;if(!best||score>best.score)best={kind:'invoice',id:invoice.id,score,title:`${invoice.number} · ${client ? (client.company_name || `${client.first_name} ${client.last_name}`.trim()) : 'Client'} · ${money(total)}`};}return {row,...(best||{kind:null,id:null,score:0,title:''})};}
  let best:any=null;for(const expense of businessExpenses){if(expense.paid)continue;const total=expense.amount_ht*(1+expense.vat_rate/100);const amountScore=Math.max(0,100-Math.abs(total-Math.abs(row.amount))*3);const text=normalize(`${row.label} ${row.reference}`);const supplierScore=expense.supplier&&text.includes(normalize(expense.supplier))?40:0;const score=amountScore+supplierScore;if(!best||score>best.score)best={kind:'expense',id:expense.id,score,title:`${expense.label} · ${expense.supplier||'Fournisseur'} · ${money(total)}`};}return {row,...(best||{kind:null,id:null,score:0,title:''})};
 }),[rows,invoices,clients,businessExpenses]);
 const visible=suggestions.filter(x=>normalize(`${x.row.label} ${x.row.reference}`).includes(normalize(query)));
 const match=(tx:BankTransaction,kind:'invoice'|'expense',id:string)=>{if(kind==='invoice')addInvoicePayment(id,{amount:tx.amount,paid_at:tx.date,method:'transfer',note:`Rapprochement bancaire : ${tx.label}`});else{const expense=businessExpenses.find(x=>x.id===id);if(expense&&!expense.paid)toggleBusinessExpensePaid(id)}persist(rows.map(x=>x.id===tx.id?{...x,matchedType:kind,matchedId:id}:x));};
 const matched=rows.filter(x=>x.matchedId).length; const balance=rows.reduce((s,x)=>s+x.amount,0);
 return <><div className="section-heading"><div><p className="eyebrow">FINANCE</p><h1>Rapprochement bancaire</h1></div><button className="primary" onClick={()=>inputRef.current?.click()}><FileUp/>Importer CSV</button><input ref={inputRef} hidden type="file" accept=".csv,text/csv" onChange={e=>onFile(e.target.files?.[0])}/></div>
 <div className="kpi-grid bank-kpis"><article className="kpi-card"><span>Opérations</span><strong>{rows.length}</strong></article><article className="kpi-card"><span>Rapprochées</span><strong>{matched}</strong></article><article className="kpi-card"><span>À contrôler</span><strong>{rows.length-matched}</strong></article><article className="kpi-card"><span>Solde importé</span><strong>{money(balance)}</strong></article></div>
 <article className="detail-card bank-help"><Landmark/><div><h2>Import local et sécurisé</h2><p>Exporte un CSV depuis ta banque. CloserFlow détecte automatiquement les encaissements clients et les paiements fournisseurs. Rien n’est envoyé en ligne.</p></div></article>
 <div className="search-box bank-search"><Search/><input placeholder="Rechercher une opération…" value={query} onChange={e=>setQuery(e.target.value)}/>{rows.length>0&&<button className="ghost" onClick={()=>{if(confirm('Supprimer toutes les opérations importées ?'))persist([])}}><RotateCcw/>Réinitialiser</button>}</div>
 <div className="bank-list">{visible.length===0?<article className="empty-state"><Landmark/><h2>Aucune opération bancaire</h2><p>Importe un fichier CSV contenant au minimum une date, un libellé et un montant.</p></article>:visible.map(({row,kind,id,score,title})=><article key={row.id} className={`bank-row ${row.matchedId?'matched':''}`}><div className="bank-sign">{row.amount>0?'+':'−'}</div><div className="bank-main"><strong>{row.label}</strong><span>{new Date(row.date).toLocaleDateString('fr-FR')} {row.reference&&`· ${row.reference}`}</span>{row.matchedId?<small><CheckCircle2/> Rapprochée avec {row.matchedType==='invoice'?'une facture':'une dépense'}</small>:kind&&score>=80?<small><Link2/> Suggestion : {title}</small>:<small>Aucune correspondance suffisamment fiable</small>}</div><strong className={row.amount>0?'bank-credit':'bank-debit'}>{money(row.amount)}</strong><div className="bank-actions">{!row.matchedId&&kind&&id&&score>=80&&<button className="primary small" onClick={()=>match(row,kind,id)}>Rapprocher</button>}<button className="icon-button danger" onClick={()=>persist(rows.filter(x=>x.id!==row.id))}><Trash2/></button></div></article>)}</div></>;
}
