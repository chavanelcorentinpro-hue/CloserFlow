import type { InventoryItem, PurchaseOrder, Supplier } from '../types/domain';

export type SupplierInvoiceLineV51={
  id:string; sku:string; description:string; quantity:number;
  unitPriceHt:number; vatRate:number; totalHt:number;
};

export type SupplierInvoiceAnalysisV51={
  supplier:string; invoiceNumber:string; invoiceDate:string;
  amountHt:number; vatRate:number; amountTtc:number;
  lines:SupplierInvoiceLineV51[];
};

export type ReconciliationLineV51={
  invoiceLine:SupplierInvoiceLineV51;
  purchaseOrderLineId:string|null;
  inventoryItemId:string|null;
  matchedDescription:string;
  expectedQuantity:number;
  alreadyReceived:number;
  receiveQuantity:number;
  priceDifference:number|null;
  confidence:number;
  status:'matched'|'stock_match'|'new_item'|'quantity_warning'|'price_warning';
};

const money=(value:string)=>{
  const n=Number(value.replace(/\s/g,'').replace(',','.'));
  return Number.isFinite(n)?n:0;
};
const normalize=(value:string)=>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim();

export function extractSupplierInvoice(text:string):SupplierInvoiceAnalysisV51{
  const clean=text.replace(/\r/g,'');
  const rows=clean.split('\n').map(x=>x.trim()).filter(Boolean);
  const supplier=rows.find(x=>x.length>2&&!/facture|invoice|total|tva|date|siret|iban/i.test(x))||'';
  const invoiceNumber=(clean.match(/(?:facture|invoice|n[°o]|num[eé]ro)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/_-]{2,})/i)||[])[1]||'';
  const date=clean.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)||clean.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  let invoiceDate=new Date().toISOString().slice(0,10);
  if(date) invoiceDate=date[1].length===4
    ?`${date[1]}-${date[2].padStart(2,'0')}-${date[3].padStart(2,'0')}`
    :`${date[3]}-${date[2].padStart(2,'0')}-${date[1].padStart(2,'0')}`;

  const vat=money((clean.match(/(?:tva|vat)\s*(?:\(|à)?\s*([0-9]{1,2}(?:[.,][0-9]+)?)\s*%/i)||[])[1]||'20');
  const ttc=money((clean.match(/(?:total\s*ttc|net\s*[àa]\s*payer|amount\s*due)\s*[:€ ]*([0-9][0-9\s.,]*)/i)||[])[1]||'0');
  const ht=money((clean.match(/(?:total\s*ht|montant\s*ht)\s*[:€ ]*([0-9][0-9\s.,]*)/i)||[])[1]||'0');

  const lines:SupplierInvoiceLineV51[]=[];
  // Formats accepted, one product per line:
  // "ABC123 | Silicone blanc | 12 | 4,50"
  // "12 x Silicone blanc 4,50 €"
  // "ABC123 Silicone blanc Qté 12 PU 4,50"
  for(const row of rows){
    if(/total|tva|facture|invoice|date|siret|iban|bic|adresse/i.test(row))continue;

    let sku='',description='',quantity=0,unitPriceHt=0;
    const pipe=row.split('|').map(x=>x.trim());
    if(pipe.length>=4){
      sku=pipe[0];description=pipe[1];quantity=money(pipe[2]);unitPriceHt=money(pipe[3]);
    }else{
      let m=row.match(/^([0-9]+(?:[.,][0-9]+)?)\s*[xX]\s+(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s*€?$/);
      if(m){quantity=money(m[1]);description=m[2].trim();unitPriceHt=money(m[3]);}
      if(!m){
        m=row.match(/^([A-Z0-9_-]{3,})\s+(.+?)\s+(?:qt[eé]?\s*)?([0-9]+(?:[.,][0-9]+)?)\s+(?:pu\s*)?([0-9]+(?:[.,][0-9]+)?)\s*€?$/i);
        if(m){sku=m[1];description=m[2].trim();quantity=money(m[3]);unitPriceHt=money(m[4]);}
      }
    }
    if(description&&quantity>0&&unitPriceHt>=0){
      lines.push({
        id:`v51-line-${lines.length+1}`,sku,description,quantity,unitPriceHt,
        vatRate:vat||20,totalHt:Number((quantity*unitPriceHt).toFixed(2))
      });
    }
  }

  const computedHt=lines.reduce((s,l)=>s+l.totalHt,0);
  const amountHt=ht||computedHt||(ttc?ttc/(1+(vat||20)/100):0);
  const amountTtc=ttc||amountHt*(1+(vat||20)/100);

  return {
    supplier,invoiceNumber,invoiceDate,
    amountHt:Number(amountHt.toFixed(2)),vatRate:vat||20,
    amountTtc:Number(amountTtc.toFixed(2)),lines
  };
}

function wordScore(a:string,b:string){
  const aa=new Set(normalize(a).split(' ').filter(x=>x.length>2));
  const bb=new Set(normalize(b).split(' ').filter(x=>x.length>2));
  if(!aa.size||!bb.size)return 0;
  let common=0;aa.forEach(x=>{if(bb.has(x))common++});
  return common/Math.max(aa.size,bb.size);
}

export function selectSupplier(supplierName:string,suppliers:Supplier[]){
  const target=normalize(supplierName);
  return [...suppliers].map(s=>({
    supplier:s,
    score:s.name&&target?(normalize(s.name)===target?1:wordScore(s.name,supplierName)):0
  })).sort((a,b)=>b.score-a.score)[0]||null;
}

export function selectPurchaseOrder(
  analysis:SupplierInvoiceAnalysisV51,
  orders:PurchaseOrder[],
  suppliers:Supplier[]
){
  const supplierMatch=selectSupplier(analysis.supplier,suppliers);
  const candidates=orders.filter(o=>o.status==='sent'||o.status==='partial');
  const filtered=supplierMatch?.score&&supplierMatch.score>.35
    ?candidates.filter(o=>o.supplier_id===supplierMatch.supplier.id)
    :candidates;
  const scored=filtered.map(order=>{
    let score=0;
    for(const inv of analysis.lines){
      const best=order.lines.reduce((max,line)=>{
        if(inv.sku&&line.sku&&normalize(inv.sku)===normalize(line.sku))return Math.max(max,1);
        return Math.max(max,wordScore(inv.description,line.description));
      },0);
      score+=best;
    }
    return {order,score:analysis.lines.length?score/analysis.lines.length:0};
  }).sort((a,b)=>b.score-a.score);
  return scored[0]||null;
}

export function reconcileSupplierInvoice(
  analysis:SupplierInvoiceAnalysisV51,
  order:PurchaseOrder|null,
  inventory:InventoryItem[]
):ReconciliationLineV51[]{
  return analysis.lines.map(invoiceLine=>{
    let bestOrder:null|{line:PurchaseOrder['lines'][number];score:number}=null;
    if(order){
      for(const line of order.lines){
        const score=invoiceLine.sku&&line.sku&&normalize(invoiceLine.sku)===normalize(line.sku)
          ?1:wordScore(invoiceLine.description,line.description);
        if(!bestOrder||score>bestOrder.score)bestOrder={line,score};
      }
    }

    let stock=inventory.find(i=>invoiceLine.sku&&i.sku&&normalize(i.sku)===normalize(invoiceLine.sku));
    if(!stock){
      stock=[...inventory].map(i=>({item:i,score:wordScore(invoiceLine.description,i.name)}))
        .sort((a,b)=>b.score-a.score)[0]?.score>.55
        ?[...inventory].map(i=>({item:i,score:wordScore(invoiceLine.description,i.name)}))
          .sort((a,b)=>b.score-a.score)[0].item
        :undefined;
    }

    if(bestOrder&&bestOrder.score>.45){
      const expected=bestOrder.line.quantity;
      const already=bestOrder.line.received_quantity||0;
      const remaining=Math.max(0,expected-already);
      const receive=Math.min(invoiceLine.quantity,remaining||invoiceLine.quantity);
      const priceDiff=bestOrder.line.unit_price_ht>0
        ?(invoiceLine.unitPriceHt-bestOrder.line.unit_price_ht)/bestOrder.line.unit_price_ht*100
        :null;
      const quantityWarning=invoiceLine.quantity>remaining&&remaining>0;
      const priceWarning=priceDiff!==null&&Math.abs(priceDiff)>10;
      return {
        invoiceLine,purchaseOrderLineId:bestOrder.line.id,
        inventoryItemId:bestOrder.line.inventory_item_id||stock?.id||null,
        matchedDescription:bestOrder.line.description,
        expectedQuantity:expected,alreadyReceived:already,receiveQuantity:receive,
        priceDifference:priceDiff,confidence:bestOrder.score,
        status:quantityWarning?'quantity_warning':priceWarning?'price_warning':'matched'
      };
    }

    return {
      invoiceLine,purchaseOrderLineId:null,inventoryItemId:stock?.id||null,
      matchedDescription:stock?.name||invoiceLine.description,
      expectedQuantity:invoiceLine.quantity,alreadyReceived:0,
      receiveQuantity:invoiceLine.quantity,priceDifference:null,
      confidence:stock?0.7:0.35,status:stock?'stock_match':'new_item'
    };
  });
}
