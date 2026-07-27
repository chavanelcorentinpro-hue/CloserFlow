export type PurchaseOrderStatus='draft'|'approved'|'ordered'|'partially_received'|'received'|'cancelled';

export type PurchaseOrderLine={
  id:string; itemId?:string; reference?:string; description:string;
  quantity:number; receivedQuantity:number; unitPrice:number; vatRate:number;
  projectIds:string[];
};

export type PurchaseOrder={
  id:string; number:string; supplier:string; supplierEmail?:string;
  status:PurchaseOrderStatus; createdAt:string; requiredDate?:string;
  lines:PurchaseOrderLine[]; note?:string; approvedAt?:string;
  orderedAt?:string; receivedAt?:string;
};

export const PURCHASE_ORDERS_KEY='closerflow.v50.purchase-orders';

export function loadPurchaseOrders():PurchaseOrder[]{
  try{return JSON.parse(localStorage.getItem(PURCHASE_ORDERS_KEY)||'[]')}
  catch{return []}
}
export function savePurchaseOrders(rows:PurchaseOrder[]){
  localStorage.setItem(PURCHASE_ORDERS_KEY,JSON.stringify(rows.slice(0,500)));
}

export function orderTotals(order:PurchaseOrder){
  const ht=order.lines.reduce((s,l)=>s+l.quantity*l.unitPrice,0);
  const vat=order.lines.reduce((s,l)=>s+l.quantity*l.unitPrice*l.vatRate/100,0);
  return {ht,vat,ttc:ht+vat};
}

export function createOrderNumber(existing:PurchaseOrder[],date=new Date()){
  const y=date.getFullYear();
  const prefix=`BC-${y}-`;
  const seq=existing
    .map(o=>o.number)
    .filter(n=>n.startsWith(prefix))
    .map(n=>Number(n.slice(prefix.length)))
    .filter(Number.isFinite);
  return `${prefix}${String((seq.length?Math.max(...seq):0)+1).padStart(4,'0')}`;
}

export function receiveLine(order:PurchaseOrder,lineId:string,quantity:number){
  const lines=order.lines.map(line=>{
    if(line.id!==lineId)return line;
    const received=Math.min(line.quantity,Math.max(line.receivedQuantity, line.receivedQuantity+quantity));
    return {...line,receivedQuantity:received};
  });
  const all=lines.every(l=>l.receivedQuantity>=l.quantity);
  const any=lines.some(l=>l.receivedQuantity>0);
  return {
    ...order,lines,
    status:(all?'received':any?'partially_received':order.status) as PurchaseOrderStatus,
    receivedAt:all?new Date().toISOString():order.receivedAt
  };
}

export function validatePurchaseOrder(order:PurchaseOrder){
  const issues:string[]=[];
  if(!order.supplier.trim())issues.push('Fournisseur manquant');
  if(!order.lines.length)issues.push('Aucune ligne');
  order.lines.forEach((l,i)=>{
    if(!l.description.trim())issues.push(`Ligne ${i+1}: désignation manquante`);
    if(!(l.quantity>0))issues.push(`Ligne ${i+1}: quantité invalide`);
    if(l.unitPrice<0)issues.push(`Ligne ${i+1}: prix invalide`);
  });
  return issues;
}
