import { useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeEuro, CheckCircle2, ClipboardCheck, PackageCheck,
  PackageOpen, Plus, Send, ShoppingCart, Trash2, Truck
} from 'lucide-react';
import {
  createOrderNumber, loadPurchaseOrders, orderTotals, receiveLine, savePurchaseOrders,
  validatePurchaseOrder, type PurchaseOrder, type PurchaseOrderStatus
} from '../lib/purchaseOrdersV50';

const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2});
const statusLabel:Record<PurchaseOrderStatus,string>={
 draft:'Brouillon',approved:'Validé',ordered:'Commandé',
 partially_received:'Réception partielle',received:'Reçu',cancelled:'Annulé'
};

export function PurchaseOrdersV50Page(){
  const [orders,setOrders]=useState<PurchaseOrder[]>(()=>loadPurchaseOrders());
  const [selected,setSelected]=useState<string|null>(()=>loadPurchaseOrders()[0]?.id||null);
  const current=orders.find(o=>o.id===selected)||null;

  const persist=(next:PurchaseOrder[])=>{setOrders(next);savePurchaseOrders(next)};
  const update=(order:PurchaseOrder)=>persist(orders.map(o=>o.id===order.id?order:o));

  const totals=useMemo(()=>orders.reduce((a,o)=>{
    const t=orderTotals(o);
    if(o.status!=='cancelled'){a.ht+=t.ht;a.ttc+=t.ttc}
    if(o.status==='ordered'||o.status==='partially_received')a.open+=t.ttc;
    return a;
  },{ht:0,ttc:0,open:0}),[orders]);

  const create=()=>{
    const now=new Date().toISOString();
    const order:PurchaseOrder={
      id:`po-${Date.now()}`,number:createOrderNumber(orders),supplier:'',
      status:'draft',createdAt:now,lines:[],note:''
    };
    persist([order,...orders]);setSelected(order.id);
  };

  const addLine=()=>{
    if(!current)return;
    update({...current,lines:[...current.lines,{
      id:`line-${Date.now()}`,description:'Nouvel article',quantity:1,receivedQuantity:0,
      unitPrice:0,vatRate:20,projectIds:[]
    }]});
  };

  const approve=()=>{
    if(!current)return;
    const issues=validatePurchaseOrder(current);
    if(issues.length){alert(issues.join('\n'));return}
    update({...current,status:'approved',approvedAt:new Date().toISOString()});
  };

  const markOrdered=()=>{
    if(!current||current.status!=='approved')return;
    update({...current,status:'ordered',orderedAt:new Date().toISOString()});
  };

  const receiveAll=()=>{
    if(!current)return;
    let next=current;
    current.lines.forEach(line=>{
      const remaining=line.quantity-line.receivedQuantity;
      if(remaining>0)next=receiveLine(next,line.id,remaining);
    });
    update(next);
  };

  const remove=()=>{
    if(!current||!confirm(`Supprimer ${current.number} ?`))return;
    const next=orders.filter(o=>o.id!==current.id);persist(next);setSelected(next[0]?.id||null);
  };

  return <>
    <div className="page-title">
      <div><p className="eyebrow">CLOSERFLOW 50 · PURCHASE ORDERS</p><h1>Bons de commande fournisseurs</h1><p>Prépare, valide, commande et réceptionne les achats issus du stock et des besoins chantier.</p></div>
      <button className="primary-button" onClick={create}><Plus/>Nouveau bon</button>
    </div>

    <section className="v50-kpis">
      <article><ShoppingCart/><span>Bons de commande</span><strong>{orders.length}</strong></article>
      <article><BadgeEuro/><span>Total HT</span><strong>{euro.format(totals.ht)}</strong></article>
      <article><Truck/><span>À réceptionner</span><strong>{euro.format(totals.open)}</strong></article>
      <article><PackageCheck/><span>Réceptionnés</span><strong>{orders.filter(o=>o.status==='received').length}</strong></article>
    </section>

    <section className="v50-layout">
      <aside className="panel v50-sidebar">
        <div className="section-heading"><div><p className="eyebrow">COMMANDES</p><h2>Historique</h2></div><ClipboardCheck/></div>
        <div className="v50-orders">{orders.map(o=><button key={o.id} className={selected===o.id?'active':''} onClick={()=>setSelected(o.id)}>
          <div><strong>{o.number}</strong><small>{o.supplier||'Fournisseur à renseigner'}</small></div>
          <span>{statusLabel[o.status]}</span>
          <b>{euro.format(orderTotals(o).ttc)}</b>
        </button>)}</div>
      </aside>

      <div className="panel">
        {!current?<div className="empty-state"><PackageOpen/><strong>Aucun bon sélectionné</strong><p>Crée un bon de commande pour commencer.</p></div>:<>
          <div className="section-heading"><div><p className="eyebrow">{current.number}</p><h2>{statusLabel[current.status]}</h2></div><ShoppingCart/></div>

          <div className="v50-fields">
            <label>Fournisseur<input value={current.supplier} disabled={current.status!=='draft'} onChange={e=>update({...current,supplier:e.target.value})}/></label>
            <label>E-mail fournisseur<input value={current.supplierEmail||''} disabled={current.status!=='draft'} onChange={e=>update({...current,supplierEmail:e.target.value})}/></label>
            <label>Date souhaitée<input type="date" value={current.requiredDate||''} disabled={current.status!=='draft'} onChange={e=>update({...current,requiredDate:e.target.value})}/></label>
          </div>

          <div className="v50-lines">
            {current.lines.map(line=><article key={line.id}>
              <input value={line.description} disabled={current.status!=='draft'} onChange={e=>update({...current,lines:current.lines.map(l=>l.id===line.id?{...l,description:e.target.value}:l)})}/>
              <input type="number" min="0.01" step="0.01" value={line.quantity} disabled={current.status!=='draft'} onChange={e=>update({...current,lines:current.lines.map(l=>l.id===line.id?{...l,quantity:Number(e.target.value)}:l)})}/>
              <input type="number" min="0" step="0.01" value={line.unitPrice} disabled={current.status!=='draft'} onChange={e=>update({...current,lines:current.lines.map(l=>l.id===line.id?{...l,unitPrice:Number(e.target.value)}:l)})}/>
              <select value={line.vatRate} disabled={current.status!=='draft'} onChange={e=>update({...current,lines:current.lines.map(l=>l.id===line.id?{...l,vatRate:Number(e.target.value)}:l)})}><option value={20}>20 %</option><option value={10}>10 %</option><option value={5.5}>5,5 %</option><option value={0}>0 %</option></select>
              <b>{euro.format(line.quantity*line.unitPrice*(1+line.vatRate/100))}</b>
              {(current.status==='ordered'||current.status==='partially_received')&&<button className="ghost" onClick={()=>update(receiveLine(current,line.id,Math.max(0,line.quantity-line.receivedQuantity)))}><PackageCheck/>{line.receivedQuantity}/{line.quantity}</button>}
            </article>)}
          </div>

          {current.status==='draft'&&<button className="secondary-button" onClick={addLine}><Plus/>Ajouter une ligne</button>}

          <div className="v50-total">
            <span>HT <strong>{euro.format(orderTotals(current).ht)}</strong></span>
            <span>TVA <strong>{euro.format(orderTotals(current).vat)}</strong></span>
            <span>TTC <strong>{euro.format(orderTotals(current).ttc)}</strong></span>
          </div>

          <label>Note<textarea rows={3} value={current.note||''} disabled={current.status==='received'||current.status==='cancelled'} onChange={e=>update({...current,note:e.target.value})}/></label>

          <div className="action-row">
            {current.status==='draft'&&<button className="primary-button" onClick={approve}><CheckCircle2/>Valider</button>}
            {current.status==='approved'&&<button className="primary-button" onClick={markOrdered}><Send/>Marquer commandé</button>}
            {(current.status==='ordered'||current.status==='partially_received')&&<button className="primary-button" onClick={receiveAll}><PackageCheck/>Tout réceptionner</button>}
            {current.status==='draft'&&<button className="secondary-button" onClick={remove}><Trash2/>Supprimer</button>}
          </div>

          {current.status==='received'&&<div className="notice"><CheckCircle2/><span>Commande réceptionnée. Les quantités peuvent maintenant alimenter le stock via le module inventaire.</span></div>}
        </>}
      </div>
    </section>

    <aside className="cloud-warning"><AlertTriangle/><div><strong>Validation obligatoire.</strong><p>V50 ne passe aucune commande auprès d’un fournisseur et ne débite aucun paiement automatiquement. Les prix et quantités restent à vérifier avant envoi réel.</p></div></aside>
  </>;
}
