export type InvoiceStockLineV52 = {
  lineId:string;
  description:string;
  quantity:number;
  saleUnitPrice:number;
  inventoryItemId:string|null;
  inventoryName:string|null;
  stockAvailable:number;
  unitCost:number;
  matched:boolean;
  confidence:number;
};

export type StockConsumptionV52 = {
  invoiceId:string;
  invoiceNumber:string;
  createdAt:string;
  lines:Array<InvoiceStockLineV52 & {
    consumedQuantity:number;
    materialCost:number;
    revenue:number;
    grossMargin:number;
  }>;
  totalMaterialCost:number;
  totalRevenue:number;
  grossMargin:number;
};

export const CONSUMPTION_KEY='closerflow.v52.invoice-stock-consumption';

const normalize=(value:string)=>
  (value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim();

function similarity(a:string,b:string){
  const aa=new Set(normalize(a).split(' ').filter(x=>x.length>2));
  const bb=new Set(normalize(b).split(' ').filter(x=>x.length>2));
  if(!aa.size||!bb.size)return 0;
  let common=0; aa.forEach(x=>{if(bb.has(x))common++});
  return common/Math.max(aa.size,bb.size);
}

export function loadConsumption():StockConsumptionV52[]{
  try{return JSON.parse(localStorage.getItem(CONSUMPTION_KEY)||'[]')}
  catch{return []}
}
export function saveConsumption(rows:StockConsumptionV52[]){
  localStorage.setItem(CONSUMPTION_KEY,JSON.stringify(rows.slice(0,2000)));
}

export function matchInvoiceLinesToStock(invoice:any, inventory:any[], priceHistory:any[]):InvoiceStockLineV52[]{
  return (invoice.lines||[]).map((line:any,index:number)=>{
    const explicitId=line.inventory_item_id||line.stock_id||line.product_id||null;
    let item=explicitId?inventory.find(i=>i.id===explicitId):null;
    let confidence=item?1:0;

    if(!item){
      const candidates=inventory.map(i=>({
        item:i,
        score: line.sku&&i.sku&&normalize(line.sku)===normalize(i.sku)
          ?1
          :similarity(line.description||line.name||'',i.name||'')
      })).sort((a,b)=>b.score-a.score);
      if(candidates[0] && candidates[0].score>=0.55){
        item=candidates[0].item;
        confidence=candidates[0].score;
      }
    }

    const history = item
      ? priceHistory.filter((h:any)=>
          (h.sku&&item.sku&&normalize(h.sku)===normalize(item.sku)) ||
          normalize(h.description||'')===normalize(item.name||'')
        ).sort((a:any,b:any)=>String(b.invoiceDate).localeCompare(String(a.invoiceDate)))
      : [];

    const unitCost = Number(
      line.purchase_price ??
      history[0]?.unitPriceHt ??
      item?.purchase_price ??
      item?.unit_cost ??
      0
    );

    return {
      lineId:line.id||`invoice-line-${index}`,
      description:line.description||line.name||'Ligne facture',
      quantity:Number(line.quantity||1),
      saleUnitPrice:Number(line.unit_price_ht||line.unit_price||line.price||0),
      inventoryItemId:item?.id||null,
      inventoryName:item?.name||null,
      stockAvailable:Number(item?.quantity||0),
      unitCost:Number.isFinite(unitCost)?unitCost:0,
      matched:!!item,
      confidence
    };
  });
}

export function buildConsumption(invoice:any, matched:InvoiceStockLineV52[]):StockConsumptionV52{
  const lines=matched.map(line=>{
    const consumedQuantity=Math.max(0,Math.min(line.quantity,line.stockAvailable));
    const materialCost=consumedQuantity*line.unitCost;
    const revenue=line.quantity*line.saleUnitPrice;
    return {
      ...line,
      consumedQuantity,
      materialCost:Number(materialCost.toFixed(2)),
      revenue:Number(revenue.toFixed(2)),
      grossMargin:Number((revenue-materialCost).toFixed(2))
    };
  });

  const totalMaterialCost=lines.reduce((s,l)=>s+l.materialCost,0);
  const totalRevenue=lines.reduce((s,l)=>s+l.revenue,0);

  return {
    invoiceId:invoice.id,
    invoiceNumber:invoice.number||invoice.id,
    createdAt:new Date().toISOString(),
    lines,
    totalMaterialCost:Number(totalMaterialCost.toFixed(2)),
    totalRevenue:Number(totalRevenue.toFixed(2)),
    grossMargin:Number((totalRevenue-totalMaterialCost).toFixed(2))
  };
}
