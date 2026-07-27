import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BadgeCheck, Camera, CheckCircle2, FileText, Link2,
  PackagePlus, PlusCircle, ScanText, Trash2
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useV4Platform } from '../context/V4PlatformContext';
import { createId } from '../lib/id';
import {
  extractSupplierInvoice, reconcileSupplierInvoice, selectPurchaseOrder,
  selectSupplier, type ReconciliationLineV51
} from '../lib/supplierInvoiceV51';

type Draft = {
  id:string;supplier:string;invoiceNumber:string;invoiceDate:string;
  amountHt:number;vatRate:number;amountTtc:number;rawText:string;
  imageDataUrl:string;createdAt:string;imported:boolean;
};

const KEY='closerflow_supplier_invoice_inbox_v51';
const PRICE_KEY='closerflow.v51.supplier-price-history';

function load():Draft[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]') as Draft[]}catch{return []}}
function save(rows:Draft[]){localStorage.setItem(KEY,JSON.stringify(rows))}
function loadPriceHistory():any[]{try{return JSON.parse(localStorage.getItem(PRICE_KEY)||'[]')}catch{return []}}
function savePriceHistory(rows:any[]){localStorage.setItem(PRICE_KEY,JSON.stringify(rows.slice(0,5000)))}

export function SupplierInvoiceCapturePage(){
  const {inventory,addBusinessExpense,addInventoryItem,adjustInventory}=useAppData();
  const {suppliers,purchaseOrders,receivePurchaseOrder}=useV4Platform();
  const [rows,setRows]=useState<Draft[]>(load);
  const [rawText,setRawText]=useState('');
  const [imageDataUrl,setImageDataUrl]=useState('');
  const [message,setMessage]=useState('');
  const [selectedOrderId,setSelectedOrderId]=useState('');
  const [review,setReview]=useState<ReconciliationLineV51[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);

  const analysis=useMemo(()=>extractSupplierInvoice(rawText),[rawText]);
  const supplierMatch=useMemo(()=>selectSupplier(analysis.supplier,suppliers),[analysis.supplier,suppliers]);
  const autoOrder=useMemo(()=>selectPurchaseOrder(analysis,purchaseOrders,suppliers),[analysis,purchaseOrders,suppliers]);
  const selectedOrder=purchaseOrders.find(o=>o.id===selectedOrderId)||autoOrder?.order||null;

  function persist(next:Draft[]){setRows(next);save(next)}
  function onFile(file?:File){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>setImageDataUrl(String(reader.result||''));
    reader.readAsDataURL(file);
  }

  function analyzeStock(){
    if(!analysis.lines.length){
      setMessage("Aucune ligne produit reconnue. Copie le texte OCR avec une ligne par article.");
      return;
    }
    const rec=reconcileSupplierInvoice(analysis,selectedOrder,inventory);
    setReview(rec);
    if(!selectedOrderId&&autoOrder?.order)setSelectedOrderId(autoOrder.order.id);
    setMessage(`${rec.length} ligne(s) analysée(s). Vérifie les correspondances avant validation.`);
  }

  function addDraft(){
    const row:Draft={
      id:createId(),supplier:analysis.supplier,invoiceNumber:analysis.invoiceNumber,
      invoiceDate:analysis.invoiceDate,amountHt:analysis.amountHt,vatRate:analysis.vatRate,
      amountTtc:analysis.amountTtc,rawText,imageDataUrl,
      createdAt:new Date().toISOString(),imported:false
    };
    persist([row,...rows]);setMessage('Facture ajoutée à la boîte de réception.');
  }

  function importExpense(row:Draft){
    addBusinessExpense({
      label:`Facture ${row.invoiceNumber||row.supplier||'fournisseur'}`,
      supplier:row.supplier||'Fournisseur à compléter',category:'materials',
      amount_ht:row.amountHt,vat_rate:row.vatRate,expense_date:row.invoiceDate,
      mission_id:null,paid:false
    });
    persist(rows.map(x=>x.id===row.id?{...x,imported:true}:x));
  }

  function applyReceipt(){
    if(!review.length)return;
    if(!confirm(`Valider ${review.length} ligne(s) et mettre à jour le stock ?`))return;

    // Lines matched with a purchase order use the existing V4 receiving engine.
    if(selectedOrder){
      const quantities:Record<string,number>={};
      review.forEach(r=>{
        if(r.purchaseOrderLineId&&r.receiveQuantity>0)
          quantities[r.purchaseOrderLineId]=(quantities[r.purchaseOrderLineId]||0)+r.receiveQuantity;
      });
      if(Object.keys(quantities).length){
        receivePurchaseOrder(
          selectedOrder.id,quantities,
          `Facture ${analysis.invoiceNumber||'fournisseur'} · rapprochement V51`
        );
      }
    }

    // Unmatched lines are directly linked to existing stock or created as new articles.
    for(const row of review.filter(r=>!r.purchaseOrderLineId&&r.receiveQuantity>0)){
      if(row.inventoryItemId){
        adjustInventory(
          row.inventoryItemId,row.receiveQuantity,'in',
          `Facture fournisseur ${analysis.invoiceNumber||analysis.supplier||'V51'}`
        );
      }else{
        addInventoryItem({
          name:row.invoiceLine.description,
          sku:row.invoiceLine.sku||`FOUR-${Date.now().toString().slice(-6)}`,
          unit:'pièce',quantity:row.receiveQuantity,minimum_quantity:0,location:'Dépôt'
        });
      }
    }

    const history=loadPriceHistory();
    const next=[...analysis.lines.map(line=>({
      id:createId(),supplier:analysis.supplier,invoiceNumber:analysis.invoiceNumber,
      invoiceDate:analysis.invoiceDate,sku:line.sku,description:line.description,
      unitPriceHt:line.unitPriceHt,quantity:line.quantity,createdAt:new Date().toISOString()
    })),...history];
    savePriceHistory(next);

    addBusinessExpense({
      label:`Facture ${analysis.invoiceNumber||analysis.supplier||'fournisseur'}`,
      supplier:analysis.supplier||'Fournisseur à compléter',category:'materials',
      amount_ht:analysis.amountHt,vat_rate:analysis.vatRate,expense_date:analysis.invoiceDate,
      mission_id:null,paid:false
    });

    setReview([]);
    setMessage('Stock mis à jour, réception enregistrée et prix fournisseur mémorisés.');
  }

  const warnings=review.filter(r=>r.status==='price_warning'||r.status==='quantity_warning').length;
  const newItems=review.filter(r=>r.status==='new_item').length;

  return <>
    <div className="page-title">
      <div>
        <p className="eyebrow">CLOSERFLOW 51 · SUPPLIER RECONCILIATION</p>
        <h1>Facture fournisseur → stock</h1>
        <p className="muted">Photo/PDF + texte OCR : CloserFlow rapproche la facture d’un bon de commande puis prépare la réception stock.</p>
      </div>
      <ScanText/>
    </div>

    {message&&<div className="notice"><BadgeCheck/><span>{message}</span></div>}

    <div className="split-grid">
      <section className="panel">
        <h2><Camera size={20}/> Facture fournisseur</h2>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={e=>onFile(e.target.files?.[0])}/>
        <button className="secondary-button" onClick={()=>fileRef.current?.click()}><Camera size={18}/> Photographier / choisir un fichier</button>

        {imageDataUrl&&imageDataUrl.startsWith('data:image')&&
          <img src={imageDataUrl} alt="Facture fournisseur" style={{width:'100%',maxHeight:260,objectFit:'contain',marginTop:12,borderRadius:12}}/>}

        <label>Texte OCR / facture<textarea rows={12} value={rawText} onChange={e=>{setRawText(e.target.value);setReview([])}} placeholder={
`POINT P
Facture FA-2026-0187
Date 27/07/2026
SIL-BL | Silicone sanitaire blanc | 12 | 4,50
PER16-R | Raccord PER 16 | 20 | 1,95
Total HT 93,00 €
TVA 20 %
Total TTC 111,60 €`
        }/></label>

        <div className="kpi-grid compact">
          <div className="kpi-card"><small>Fournisseur</small><strong>{analysis.supplier||'À détecter'}</strong></div>
          <div className="kpi-card"><small>N° facture</small><strong>{analysis.invoiceNumber||'À détecter'}</strong></div>
          <div className="kpi-card"><small>Lignes reconnues</small><strong>{analysis.lines.length}</strong></div>
          <div className="kpi-card"><small>Total TTC</small><strong>{analysis.amountTtc.toFixed(2)} €</strong></div>
        </div>

        <div className="v51-match">
          <p><strong>Fournisseur :</strong> {supplierMatch&&supplierMatch.score>.35?supplierMatch.supplier.name:'Aucune correspondance certaine'}</p>
          <label>Bon de commande
            <select value={selectedOrderId||autoOrder?.order.id||''} onChange={e=>{setSelectedOrderId(e.target.value);setReview([])}}>
              <option value="">Aucun / réception libre</option>
              {purchaseOrders.filter(o=>o.status==='sent'||o.status==='partial').map(o=>
                <option key={o.id} value={o.id}>{o.number} · {suppliers.find(s=>s.id===o.supplier_id)?.name||'Fournisseur'} · {o.status}</option>
              )}
            </select>
          </label>
          {autoOrder?.order&&<small>Correspondance automatique proposée : {autoOrder.order.number} ({Math.round(autoOrder.score*100)} %)</small>}
        </div>

        <div className="action-row">
          <button className="primary-button" disabled={!analysis.lines.length} onClick={analyzeStock}><Link2/>Analyser & rapprocher</button>
          <button className="secondary-button" disabled={!rawText.trim()} onClick={addDraft}><PlusCircle/>Garder en attente</button>
        </div>
      </section>

      <section className="panel">
        <h2><PackagePlus size={20}/> Réception proposée</h2>
        {!review.length&&<p className="empty-state">Analyse la facture pour préparer les mouvements de stock.</p>}

        {review.length>0&&<>
          <div className="v51-summary">
            <span>{review.length} ligne(s)</span>
            <span>{newItems} nouvel(aux) article(s)</span>
            <span>{warnings} alerte(s)</span>
          </div>

          <div className="v51-review">
            {review.map(row=><article key={row.invoiceLine.id} className={row.status.includes('warning')?'warning':''}>
              <div>
                <strong>{row.invoiceLine.description}</strong>
                <small>{row.invoiceLine.sku||'Sans référence'} · facture : {row.invoiceLine.quantity} × {row.invoiceLine.unitPriceHt.toFixed(2)} € HT</small>
                <p>→ {row.matchedDescription}</p>
              </div>
              <span>{Math.round(row.confidence*100)} %</span>
              <b>+{row.receiveQuantity}</b>
              <em>{
                row.status==='matched'?'BC reconnu':
                row.status==='stock_match'?'Article stock reconnu':
                row.status==='new_item'?'Nouvel article':
                row.status==='price_warning'?'Prix différent > 10 %':'Quantité supérieure au reliquat'
              }</em>
              {row.priceDifference!==null&&<small>Écart prix : {row.priceDifference>0?'+':''}{row.priceDifference.toFixed(1)} %</small>}
            </article>)}
          </div>

          {warnings>0&&<div className="notice v51-warning"><AlertTriangle/><span>Des différences de prix ou quantité doivent être vérifiées avant validation.</span></div>}
          <button className="primary-button" onClick={applyReceipt}><CheckCircle2/>Valider réception & mettre à jour le stock</button>
        </>}
      </section>
    </div>

    <section className="panel">
      <h2><FileText/> Boîte de réception ({rows.length})</h2>
      {!rows.length&&<p className="empty-state">Aucune facture en attente.</p>}
      <div className="stack-list">{rows.map(row=><article className="list-card" key={row.id}>
        <div><strong>{row.supplier||'Fournisseur à compléter'}</strong><small>{row.invoiceNumber||'Sans numéro'} · {row.invoiceDate}</small><p>{row.amountHt.toFixed(2)} € HT · TVA {row.vatRate}% · {row.amountTtc.toFixed(2)} € TTC</p></div>
        <div className="inline-actions">
          <button className="secondary-button" disabled={row.imported} onClick={()=>importExpense(row)}>{row.imported?'Dépense créée':'Créer la dépense'}</button>
          <button className="icon-button danger" aria-label="Supprimer" onClick={()=>persist(rows.filter(x=>x.id!==row.id))}><Trash2 size={17}/></button>
        </div>
      </article>)}</div>
    </section>
  </>;
}
