import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Boxes, Building2, CheckCircle2, ClipboardList,
  Download, Factory, Gauge, PackageCheck, Plus, RefreshCcw, ShieldCheck,
  ShoppingCart, Target, Truck, Warehouse, Wrench
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useV4Platform } from '../context/V4PlatformContext';
import { createId } from '../lib/id';

type Reservation={id:string;mission_id:string;inventory_item_id:string;quantity:number;note:string;created_at:string};
type ProcurementNeed={id:string;mission_id:string;label:string;unit:string;quantity:number;inventory_item_id:string|null;status:'open'|'ordered'|'covered';note:string;created_at:string};
type SupplierTarget={supplier_id:string;lead_days:number;minimum_order:number;preferred:boolean;notes:string};

type CatalogRow={id?:string;code?:string;label?:string;category?:string;unit?:string;purchase?:number;sale?:number};

const RES_KEY='closerflow.supply.reservations.v13.7';
const NEED_KEY='closerflow.supply.needs.v13.7';
const TARGET_KEY='closerflow.supply.suppliers.v13.7';
const CATALOG_KEY='closerflow.catalog.v12.4';
const money=(n:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number.isFinite(n)?n:0);
const date=(d:string|null|undefined)=>d?new Date(d).toLocaleDateString('fr-FR'):'—';
const read=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}};
const save=<T,>(key:string,value:T)=>localStorage.setItem(key,JSON.stringify(value));
const csv=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
const download=(name:string,content:string)=>{const blob=new Blob([content],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)};

export function SupplyChainPage(){
 const data=useAppData();
 const platform=useV4Platform();
 const {inventory,missions,businessExpenses,timeEntries,invoices}=data;
 const [tab,setTab]=useState<'planner'|'missions'|'suppliers'|'margin'>('planner');
 const [reservations,setReservations]=useState<Reservation[]>(()=>read(RES_KEY,[]));
 const [needs,setNeeds]=useState<ProcurementNeed[]>(()=>read(NEED_KEY,[]));
 const [targets,setTargets]=useState<SupplierTarget[]>(()=>read(TARGET_KEY,[]));
 const [selected,setSelected]=useState<Record<string,boolean>>({});
 const [supplierId,setSupplierId]=useState('');
 const [warehouseId,setWarehouseId]=useState('');
 const [bufferPercent,setBufferPercent]=useState(25);
 const [coverDays,setCoverDays]=useState(14);

 const persistReservations=(rows:Reservation[])=>{setReservations(rows);save(RES_KEY,rows)};
 const persistNeeds=(rows:ProcurementNeed[])=>{setNeeds(rows);save(NEED_KEY,rows)};
 const persistTargets=(rows:SupplierTarget[])=>{setTargets(rows);save(TARGET_KEY,rows)};

 const catalog=useMemo(()=>read<CatalogRow[]>(CATALOG_KEY,[]),[]);
 const reservationByItem=useMemo(()=>reservations.reduce<Record<string,number>>((acc,r)=>{acc[r.inventory_item_id]=(acc[r.inventory_item_id]||0)+r.quantity;return acc},{}),[reservations]);
 const openOrderedByItem=useMemo(()=>platform.purchaseOrders.filter(o=>['draft','sent','partial'].includes(o.status)).flatMap(o=>o.lines).reduce<Record<string,number>>((acc,l)=>{const id=l.inventory_item_id||'';if(id)acc[id]=(acc[id]||0)+Math.max(0,l.quantity-(l.received_quantity??0));return acc},{}),[platform.purchaseOrders]);
 const priceFor=(sku:string,name:string)=>{const c=catalog.find(x=>x.code?.toLowerCase()===sku.toLowerCase())||catalog.find(x=>x.label?.toLowerCase()===name.toLowerCase());return Number(c?.purchase)||0};

 const shortages=useMemo(()=>inventory.map(item=>{
   const reserved=reservationByItem[item.id]||0;
   const ordered=openOrderedByItem[item.id]||0;
   const available=item.quantity-reserved;
   const target=Math.max(item.minimum_quantity,Math.ceil(item.minimum_quantity*(1+bufferPercent/100)));
   const required=Math.max(0,target-available-ordered);
   const purchasePrice=priceFor(item.sku,item.name);
   return {item,reserved,ordered,available,target,required,purchasePrice,estimated:required*purchasePrice};
 }).filter(x=>x.required>0||x.available<x.item.minimum_quantity).sort((a,b)=>b.required-a.required||a.available-b.available),[inventory,reservationByItem,openOrderedByItem,bufferPercent,catalog]);

 const supplierScores=useMemo(()=>platform.suppliers.map(s=>{
   const orders=platform.purchaseOrders.filter(o=>o.supplier_id===s.id&&o.status!=='cancelled');
   const received=orders.filter(o=>o.status==='received').length;
   const late=orders.filter(o=>o.expected_at&&new Date(o.expected_at).getTime()<Date.now()&&!['received','cancelled'].includes(o.status)).length;
   const spend=orders.reduce((sum,o)=>sum+o.lines.reduce((a,l)=>a+l.quantity*l.unit_price_ht,0),0);
   const orderedQty=orders.reduce((sum,o)=>sum+o.lines.reduce((a,l)=>a+l.quantity,0),0);
   const receivedQty=orders.reduce((sum,o)=>sum+o.lines.reduce((a,l)=>a+(l.received_quantity??0),0),0);
   const fill=orderedQty?receivedQty/orderedQty*100:100;
   const target=targets.find(t=>t.supplier_id===s.id);
   const score=Math.max(0,Math.min(100,Math.round(55+Math.min(25,fill/4)-late*15+(target?.preferred?10:0))));
   return {supplier:s,orders:orders.length,received,late,spend,fill,score,target};
 }).sort((a,b)=>b.score-a.score||b.spend-a.spend),[platform.suppliers,platform.purchaseOrders,targets]);

 const missionNeeds=useMemo(()=>missions.filter(m=>!['paid','archived'].includes(m.status)).flatMap(m=>(m.materials??[]).map(mat=>{
   const item=inventory.find(i=>i.sku.toLowerCase()===mat.label.toLowerCase()||i.name.toLowerCase()===mat.label.toLowerCase());
   const reserved=item?reservations.filter(r=>r.mission_id===m.id&&r.inventory_item_id===item.id).reduce((s,r)=>s+r.quantity,0):0;
   const custom=needs.filter(n=>n.mission_id===m.id&&n.label.toLowerCase()===mat.label.toLowerCase()&&n.status!=='covered').reduce((s,n)=>s+n.quantity,0);
   const available=item?Math.max(0,item.quantity-(reservationByItem[item.id]||0)+reserved):0;
   const missing=Math.max(0,mat.quantity-reserved-available+custom);
   return {mission:m,material:mat,item,reserved,available,missing};
 })),[missions,inventory,reservations,needs,reservationByItem]);

 const marginRows=useMemo(()=>missions.map(m=>{
   const revenue=invoices.filter(i=>i.mission_id===m.id&&!['draft'].includes(i.status)).reduce((sum,i)=>sum+i.lines.reduce((a,l)=>a+l.quantity*l.unit_price_ht,0)*(1-(i.discount_percent||0)/100),0);
   const labor=timeEntries.filter(t=>t.mission_id===m.id&&t.ended_at).reduce((sum,t)=>sum+Math.max(0,new Date(t.ended_at!).getTime()-new Date(t.started_at).getTime())/3600000*t.hourly_cost,0);
   const expense=businessExpenses.filter(e=>e.mission_id===m.id).reduce((sum,e)=>sum+e.amount_ht,0);
   const missionMaterial=(m.materials??[]).reduce((sum,mat)=>{const item=inventory.find(i=>i.name.toLowerCase()===mat.label.toLowerCase()||i.sku.toLowerCase()===mat.label.toLowerCase());return sum+mat.quantity*(item?priceFor(item.sku,item.name):0)},0);
   const committed=platform.purchaseOrders.filter(o=>o.status!=='cancelled').flatMap(o=>o.lines).filter(l=>l.description.toLowerCase().includes(m.title.toLowerCase())).reduce((s,l)=>s+l.quantity*l.unit_price_ht,0);
   const cost=labor+expense+missionMaterial+committed;
   const margin=revenue-cost;
   const rate=revenue?margin/revenue*100:0;
   return {mission:m,revenue,labor,expense,missionMaterial,committed,cost,margin,rate};
 }).filter(x=>x.revenue>0||x.cost>0).sort((a,b)=>a.rate-b.rate),[missions,invoices,timeEntries,businessExpenses,inventory,platform.purchaseOrders,catalog]);

 const totalShortage=shortages.reduce((s,x)=>s+x.required,0);
 const shortageValue=shortages.reduce((s,x)=>s+x.estimated,0);
 const openOrders=platform.purchaseOrders.filter(o=>['draft','sent','partial'].includes(o.status));
 const lateOrders=openOrders.filter(o=>o.expected_at&&new Date(o.expected_at).getTime()<Date.now());
 const atRiskMissions=marginRows.filter(x=>x.revenue>0&&x.rate<25);

 const createReorder=()=>{
   const rows=shortages.filter(x=>selected[x.item.id]&&x.required>0);
   if(!rows.length){alert('Sélectionne au moins un article à commander.');return}
   platform.addPurchaseOrder({supplier_id:supplierId||null,warehouse_id:warehouseId||null,status:'draft',expected_at:new Date(Date.now()+Math.max(1,coverDays)*86400000).toISOString().slice(0,10),lines:rows.map(x=>({id:createId(),description:x.item.name,sku:x.item.sku,quantity:x.required,received_quantity:0,unit:x.item.unit,unit_price_ht:x.purchasePrice,inventory_item_id:x.item.id}))});
   setSelected({});
   alert(`Bon de commande créé avec ${rows.length} ligne(s).`);
 };
 const reserve=(missionId:string,itemId:string,quantity:number,note='')=>{if(quantity<=0)return;const item=inventory.find(i=>i.id===itemId);const already=reservationByItem[itemId]||0;const available=Math.max(0,(item?.quantity||0)-already);const qty=Math.min(quantity,available);if(qty<=0){alert('Stock disponible insuffisant.');return}persistReservations([{id:createId(),mission_id:missionId,inventory_item_id:itemId,quantity:qty,note,created_at:new Date().toISOString()},...reservations])};
 const createNeed=(missionId:string,label:string,unit:string,quantity:number,itemId:string|null)=>persistNeeds([{id:createId(),mission_id:missionId,label,unit,quantity:Math.max(0.01,quantity),inventory_item_id:itemId,status:'open',note:'Besoin généré depuis le chantier',created_at:new Date().toISOString()},...needs]);
 const markNeed=(id:string,status:ProcurementNeed['status'])=>persistNeeds(needs.map(n=>n.id===id?{...n,status}:n));
 const supplierSetting=(id:string,patch:Partial<SupplierTarget>)=>{const existing=targets.find(t=>t.supplier_id===id)||{supplier_id:id,lead_days:7,minimum_order:0,preferred:false,notes:''};persistTargets([...targets.filter(t=>t.supplier_id!==id),{...existing,...patch}])};
 const exportCsv=()=>{const rows=[['type','reference','designation','quantite','stock_disponible','commande_ouverte','cout_estime','statut'],...shortages.map(x=>['reassort',x.item.sku,x.item.name,x.required,x.available,x.ordered,x.estimated,x.available<x.item.minimum_quantity?'critique':'a_prevoir']),...needs.map(n=>['chantier',n.mission_id,n.label,n.quantity,'','','',n.status])];download(`closerflow-supply-chain-${new Date().toISOString().slice(0,10)}.csv`,rows.map(r=>r.map(csv).join(';')).join('\n'))};

 return <div className="supply-page">
  <div className="page-title"><div><p className="eyebrow">V13.7 · SUPPLY CHAIN & MARGE</p><h1>Achats, stock et marge</h1><p>Réassort, réservations chantier, fournisseurs et protection de marge dans un même cockpit.</p></div><Factory/></div>
  <div className="kpi-grid supply-kpis"><article><span>Articles à réassortir</span><strong>{shortages.length}</strong><small>{totalShortage.toFixed(1)} unité(s)</small></article><article><span>Budget réassort estimé</span><strong>{money(shortageValue)}</strong><small>Selon prix d’achat catalogue</small></article><article><span>Commandes ouvertes</span><strong>{openOrders.length}</strong><small>{lateOrders.length} en retard</small></article><article><span>Chantiers marge &lt; 25 %</span><strong>{atRiskMissions.length}</strong><small>À protéger avant clôture</small></article></div>
  <div className="assistant-tabs supply-tabs"><button className={tab==='planner'?'active':''} onClick={()=>setTab('planner')}><Boxes/>Réassort</button><button className={tab==='missions'?'active':''} onClick={()=>setTab('missions')}><ClipboardList/>Chantiers</button><button className={tab==='suppliers'?'active':''} onClick={()=>setTab('suppliers')}><Truck/>Fournisseurs</button><button className={tab==='margin'?'active':''} onClick={()=>setTab('margin')}><Gauge/>Marge</button></div>

  {tab==='planner'&&<div className="supply-grid"><section className="panel supply-wide"><div className="section-heading"><div><h2>Plan de réassort intelligent</h2><p>Stock réel − réservations + commandes ouvertes, avec buffer configurable.</p></div><div className="row-actions"><button className="ghost small" onClick={exportCsv}><Download/>CSV</button><Link className="ghost small" to="/inventory"><Warehouse/>Stock</Link></div></div><div className="form-grid supply-settings"><label>Buffer de sécurité %<input type="number" min="0" max="300" value={bufferPercent} onChange={e=>setBufferPercent(Number(e.target.value)||0)}/></label><label>Horizon livraison (jours)<input type="number" min="1" max="180" value={coverDays} onChange={e=>setCoverDays(Number(e.target.value)||14)}/></label><label>Fournisseur<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Non défini</option>{platform.suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Livraison<select value={warehouseId} onChange={e=>setWarehouseId(e.target.value)}><option value="">Non définie</option>{platform.warehouses.filter(w=>w.active).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div><div className="supply-list">{shortages.map(x=><article className={`supply-row ${x.available<x.item.minimum_quantity?'critical':''}`} key={x.item.id}><input type="checkbox" checked={!!selected[x.item.id]} onChange={e=>setSelected({...selected,[x.item.id]:e.target.checked})}/><div className="supply-main"><strong>{x.item.name}</strong><small>{x.item.sku||'Sans SKU'} · {x.item.location||'Sans emplacement'}</small></div><div><span>Stock</span><b>{x.item.quantity} {x.item.unit}</b></div><div><span>Réservé</span><b>{x.reserved}</b></div><div><span>Commandé</span><b>{x.ordered}</b></div><div><span>À commander</span><b>{x.required}</b></div><div><span>Budget</span><b>{money(x.estimated)}</b></div></article>)}{!shortages.length&&<div className="empty-state"><CheckCircle2/><strong>Stock couvert</strong><span>Aucun réassort requis avec les paramètres actuels.</span></div>}</div><button className="primary-button supply-create-order" onClick={createReorder}><ShoppingCart/>Créer un bon de commande avec la sélection</button></section>
  <section className="panel"><div className="section-heading"><div><h2>Alertes approvisionnement</h2><p>Points à traiter maintenant.</p></div><AlertTriangle/></div><div className="supply-alerts">{lateOrders.map(o=><Link to="/procurement" key={o.id}><AlertTriangle/><div><strong>{o.number} en retard</strong><small>Prévu le {date(o.expected_at)}</small></div><ArrowRight/></Link>)}{shortages.slice(0,6).map(x=><Link to="/inventory" key={x.item.id}><Boxes/><div><strong>{x.item.name}</strong><small>Disponible {x.available} · seuil {x.item.minimum_quantity}</small></div><ArrowRight/></Link>)}{!lateOrders.length&&!shortages.length&&<div className="empty-state compact"><ShieldCheck/><p>Aucune alerte critique.</p></div>}</div></section></div>}

  {tab==='missions'&&<div className="supply-grid"><section className="panel supply-wide"><div className="section-heading"><div><h2>Couverture matériaux chantier</h2><p>Réserver le stock disponible ou générer un besoin d’achat.</p></div><Wrench/></div><div className="supply-list">{missionNeeds.map(row=><article className={`mission-supply-row ${row.missing>0?'warning':''}`} key={`${row.mission.id}-${row.material.id}`}><div className="supply-main"><strong>{row.mission.title}</strong><small>{row.material.label} · besoin {row.material.quantity} {row.material.unit}</small></div><div><span>Disponible</span><b>{row.available}</b></div><div><span>Réservé</span><b>{row.reserved}</b></div><div><span>Manquant</span><b>{row.missing}</b></div><div className="row-actions">{row.item&&row.available>0&&<button className="ghost small" onClick={()=>reserve(row.mission.id,row.item!.id,Math.min(row.material.quantity-row.reserved,row.available),`Réservation ${row.mission.title}`)}>Réserver</button>}{row.missing>0&&<button className="primary small" onClick={()=>createNeed(row.mission.id,row.material.label,row.material.unit,row.missing,row.item?.id||null)}><Plus/>Besoin</button>}<Link className="ghost small" to={`/missions/${row.mission.id}`}>Chantier</Link></div></article>)}{!missionNeeds.length&&<div className="empty-state"><ClipboardList/><strong>Aucun matériau déclaré</strong><span>Ajoute des matériaux dans les chantiers pour calculer leur couverture.</span></div>}</div></section>
  <section className="panel"><div className="section-heading"><div><h2>Besoins d’achat</h2><p>{needs.filter(n=>n.status==='open').length} ouvert(s).</p></div><PackageCheck/></div><div className="need-list">{needs.map(n=><article key={n.id} className={n.status}><div><strong>{n.label}</strong><small>{missions.find(m=>m.id===n.mission_id)?.title||'Chantier'} · {n.quantity} {n.unit}</small></div><select value={n.status} onChange={e=>markNeed(n.id,e.target.value as ProcurementNeed['status'])}><option value="open">Ouvert</option><option value="ordered">Commandé</option><option value="covered">Couvert</option></select></article>)}{!needs.length&&<div className="empty-state compact"><CheckCircle2/><p>Aucun besoin enregistré.</p></div>}</div></section>
  <section className="panel supply-wide"><div className="section-heading"><div><h2>Réservations stock</h2><p>Protection du matériel déjà affecté aux chantiers.</p></div><Target/></div><div className="reservation-grid">{reservations.map(r=><article key={r.id}><div><strong>{inventory.find(i=>i.id===r.inventory_item_id)?.name||'Article supprimé'}</strong><small>{missions.find(m=>m.id===r.mission_id)?.title||'Mission supprimée'} · {r.quantity} · {r.note}</small></div><button className="ghost small danger" onClick={()=>persistReservations(reservations.filter(x=>x.id!==r.id))}>Libérer</button></article>)}{!reservations.length&&<div className="empty-state compact"><Boxes/><p>Aucune réservation active.</p></div>}</div></section></div>}

  {tab==='suppliers'&&<div className="supply-grid"><section className="panel supply-wide"><div className="section-heading"><div><h2>Score fournisseurs</h2><p>Fiabilité calculée sur réceptions, retards, volume et préférence.</p></div><Truck/></div><div className="supplier-score-list">{supplierScores.map(x=><article key={x.supplier.id}><div className={`supplier-score ${x.score<60?'bad':x.score<80?'mid':'good'}`}>{x.score}</div><div className="supply-main"><strong>{x.supplier.name}</strong><small>{x.orders} commande(s) · fill rate {x.fill.toFixed(0)} % · {x.late} retard(s)</small><b>{money(x.spend)} engagés</b></div><label>Délai cible<input type="number" min="1" value={x.target?.lead_days??7} onChange={e=>supplierSetting(x.supplier.id,{lead_days:Number(e.target.value)||7})}/></label><label>Mini commande<input type="number" min="0" value={x.target?.minimum_order??0} onChange={e=>supplierSetting(x.supplier.id,{minimum_order:Number(e.target.value)||0})}/></label><label className="checkbox-row"><input type="checkbox" checked={!!x.target?.preferred} onChange={e=>supplierSetting(x.supplier.id,{preferred:e.target.checked})}/>Préféré</label></article>)}{!supplierScores.length&&<div className="empty-state"><Truck/><strong>Aucun fournisseur</strong><span>Crée tes fournisseurs dans Achats & logistique.</span></div>}</div></section><section className="panel"><div className="section-heading"><div><h2>Commandes ouvertes</h2><p>{openOrders.length} en cours.</p></div><ShoppingCart/></div><div className="open-order-list">{openOrders.slice(0,12).map(o=><article key={o.id}><div><strong>{o.number}</strong><small>{platform.suppliers.find(s=>s.id===o.supplier_id)?.name||'Sans fournisseur'} · attendu {date(o.expected_at)}</small></div><span className={`status-pill ${lateOrders.some(x=>x.id===o.id)?'overdue':o.status}`}>{lateOrders.some(x=>x.id===o.id)?'retard':o.status}</span></article>)}</div><Link className="primary-button" to="/procurement">Ouvrir les achats <ArrowRight/></Link></section></div>}

  {tab==='margin'&&<div className="supply-grid"><section className="panel supply-wide"><div className="section-heading"><div><h2>Protection de marge chantier</h2><p>CA facturé vs main-d’œuvre, dépenses et matériaux valorisés.</p></div><Gauge/></div><div className="margin-guard-list">{marginRows.map(x=><article key={x.mission.id} className={x.revenue>0&&x.rate<25?'risk':''}><div className="supply-main"><strong>{x.mission.title}</strong><small>{x.mission.status} · CA {money(x.revenue)}</small></div><div><span>Main-d’œuvre</span><b>{money(x.labor)}</b></div><div><span>Dépenses</span><b>{money(x.expense)}</b></div><div><span>Matériaux</span><b>{money(x.missionMaterial)}</b></div><div><span>Coût total</span><b>{money(x.cost)}</b></div><div><span>Marge</span><b className={x.margin<0?'negative':''}>{money(x.margin)}</b></div><div className={`margin-rate ${x.rate<25?'bad':x.rate<35?'mid':'good'}`}>{x.rate.toFixed(1)} %</div><Link className="ghost small" to={`/missions/${x.mission.id}`}>Ouvrir</Link></article>)}{!marginRows.length&&<div className="empty-state"><Gauge/><strong>Pas encore de données de marge</strong><span>Les factures, heures et dépenses alimenteront automatiquement ce tableau.</span></div>}</div></section><section className="panel"><div className="section-heading"><div><h2>Résumé marge</h2><p>Décisions rapides.</p></div><ShieldCheck/></div><div className="supply-summary"><article><span>CA analysé</span><strong>{money(marginRows.reduce((s,x)=>s+x.revenue,0))}</strong></article><article><span>Coûts analysés</span><strong>{money(marginRows.reduce((s,x)=>s+x.cost,0))}</strong></article><article><span>Marge globale</span><strong>{money(marginRows.reduce((s,x)=>s+x.margin,0))}</strong></article><article><span>Chantiers à risque</span><strong>{atRiskMissions.length}</strong></article></div></section></div>}
 </div>;
}
