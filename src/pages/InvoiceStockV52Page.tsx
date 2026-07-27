import { useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeEuro, Boxes, CheckCircle2, PackageMinus,
  ReceiptText, RefreshCw, TrendingUp
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import {
  buildConsumption, loadConsumption, matchInvoiceLinesToStock, saveConsumption,
  type StockConsumptionV52
} from '../lib/invoiceStockV52';

const PRICE_KEY='closerflow.v51.supplier-price-history';
function loadPriceHistory():any[]{try{return JSON.parse(localStorage.getItem(PRICE_KEY)||'[]')}catch{return []}}
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2});

export function InvoiceStockV52Page(){
  const data=useAppData() as any;
  const [invoiceId,setInvoiceId]=useState('');
  const [history,setHistory]=useState<StockConsumptionV52[]>(()=>loadConsumption());
  const [message,setMessage]=useState('');

  const invoices=(data.invoices||[]).filter((i:any)=>i.status!=='cancelled');
  const invoice=invoices.find((i:any)=>i.id===invoiceId)||null;
  const priceHistory=useMemo(()=>loadPriceHistory(),[]);
  const matched=useMemo(
    ()=>invoice?matchInvoiceLinesToStock(invoice,data.inventory||[],priceHistory):[],
    [invoice,data.inventory,priceHistory]
  );
  const preview=invoice?buildConsumption(invoice,matched):null;

  const unmatched=matched.filter(m=>!m.matched);
  const insufficient=matched.filter(m=>m.matched&&m.stockAvailable<m.quantity);

  const apply=()=>{
    if(!invoice||!preview)return;
    if(unmatched.length){
      alert('Certaines lignes ne sont pas reliées à un article de stock. Corrige-les avant validation.');
      return;
    }
    if(!confirm(`Déduire les articles du stock pour la facture ${invoice.number||invoice.id} ?`))return;

    for(const line of preview.lines){
      if(!line.inventoryItemId||line.consumedQuantity<=0)continue;
      data.adjustInventory(
        line.inventoryItemId,
        line.consumedQuantity,
        'out',
        `Facture client ${invoice.number||invoice.id}`
      );
    }

    const next=[preview,...history.filter(h=>h.invoiceId!==preview.invoiceId)];
    setHistory(next);saveConsumption(next);
    setMessage(`Stock déduit. Coût matière enregistré : ${euro.format(preview.totalMaterialCost)}.`);
  };

  const totalMaterial=history.reduce((s,h)=>s+h.totalMaterialCost,0);
  const totalRevenue=history.reduce((s,h)=>s+h.totalRevenue,0);
  const grossMargin=totalRevenue-totalMaterial;

  return <>
    <div className="page-title">
      <div>
        <p className="eyebrow">CLOSERFLOW 52 · STOCK OUT & MARGIN</p>
        <h1>Facture client → sortie de stock</h1>
        <p>Relie les lignes facturées au stock, utilise les derniers coûts fournisseurs et calcule la marge matière réelle.</p>
      </div>
      <PackageMinus/>
    </div>

    {message&&<div className="notice"><CheckCircle2/><span>{message}</span></div>}

    <section className="v52-kpis">
      <article><ReceiptText/><span>Factures traitées</span><strong>{history.length}</strong></article>
      <article><Boxes/><span>Coût matière</span><strong>{euro.format(totalMaterial)}</strong></article>
      <article><BadgeEuro/><span>CA lignes traitées</span><strong>{euro.format(totalRevenue)}</strong></article>
      <article><TrendingUp/><span>Marge brute matière</span><strong>{euro.format(grossMargin)}</strong></article>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">FACTURE</p><h2>Préparer la sortie de stock</h2></div><RefreshCw/></div>
      <label className="v52-select">Facture
        <select value={invoiceId} onChange={e=>setInvoiceId(e.target.value)}>
          <option value="">Sélectionner une facture</option>
          {invoices.map((i:any)=><option key={i.id} value={i.id}>{i.number||i.id} · {i.status}</option>)}
        </select>
      </label>

      {preview&&<>
        <div className="v52-summary">
          <span>CA : <strong>{euro.format(preview.totalRevenue)}</strong></span>
          <span>Coût matière : <strong>{euro.format(preview.totalMaterialCost)}</strong></span>
          <span>Marge brute : <strong>{euro.format(preview.grossMargin)}</strong></span>
        </div>

        <div className="v52-list">
          {preview.lines.map(line=><article key={line.lineId} className={!line.matched||line.stockAvailable<line.quantity?'warning':''}>
            <div>
              <strong>{line.description}</strong>
              <small>{line.inventoryName||'Aucun article stock reconnu'} · confiance {Math.round(line.confidence*100)} %</small>
            </div>
            <span>Qté {line.quantity}</span>
            <span>Stock {line.stockAvailable}</span>
            <span>Coût {euro.format(line.unitCost)}</span>
            <b>{euro.format(line.grossMargin)}</b>
          </article>)}
        </div>

        {unmatched.length>0&&<div className="notice v52-warning"><AlertTriangle/><span>{unmatched.length} ligne(s) non reliée(s) au stock.</span></div>}
        {insufficient.length>0&&<div className="notice v52-warning"><AlertTriangle/><span>{insufficient.length} ligne(s) dépassent le stock disponible. La sortie est plafonnée au stock réel.</span></div>}

        <button className="primary-button" disabled={unmatched.length>0} onClick={apply}>
          <PackageMinus/>Valider la sortie de stock
        </button>
      </>}
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">HISTORIQUE</p><h2>Marge matière enregistrée</h2></div><TrendingUp/></div>
      <div className="v52-history">
        {history.map(row=><article key={row.invoiceId}>
          <div><strong>{row.invoiceNumber}</strong><small>{new Date(row.createdAt).toLocaleString('fr-FR')}</small></div>
          <span>Coût {euro.format(row.totalMaterialCost)}</span>
          <span>CA {euro.format(row.totalRevenue)}</span>
          <b>Marge {euro.format(row.grossMargin)}</b>
        </article>)}
      </div>
      {!history.length&&<p className="empty-state">Aucune facture client n’a encore généré de sortie de stock.</p>}
    </section>
  </>;
}
