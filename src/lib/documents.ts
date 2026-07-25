import type { DocumentLine } from '../types/domain';

export function subtotal(lines:DocumentLine[]){
  return lines.reduce((sum,line)=>sum+(Number(line.quantity)||0)*(Number(line.unit_price_ht)||0),0);
}
export function totals(lines:DocumentLine[],discountPercent:number,vatRate:number){
  const base=subtotal(lines);
  const discount=base*(Number(discountPercent)||0)/100;
  const ht=Math.max(0,base-discount);
  const vat=ht*(Number(vatRate)||0)/100;
  return {base,discount,ht,vat,ttc:ht+vat};
}
export const money=(value:number)=>value.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
