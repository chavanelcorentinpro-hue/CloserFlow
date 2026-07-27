import { useMemo } from 'react';
import { AlertTriangle, BadgeEuro, History, TrendingDown, TrendingUp } from 'lucide-react';

const KEY='closerflow.v51.supplier-price-history';
type Row={id:string;supplier:string;invoiceNumber:string;invoiceDate:string;sku:string;description:string;unitPriceHt:number;quantity:number;createdAt:string};
function load():Row[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2});

export function SupplierPricesV51Page(){
  const rows=load();
  const groups=useMemo(()=>{
    const map=new Map<string,Row[]>();
    rows.forEach(r=>{const key=r.sku||r.description.toLowerCase();map.set(key,[...(map.get(key)||[]),r])});
    return [...map.values()].map(items=>{
      const sorted=[...items].sort((a,b)=>b.invoiceDate.localeCompare(a.invoiceDate));
      const latest=sorted[0],previous=sorted[1];
      const avg=items.reduce((s,r)=>s+r.unitPriceHt,0)/items.length;
      const diff=previous&&previous.unitPriceHt?((latest.unitPriceHt-previous.unitPriceHt)/previous.unitPriceHt*100):0;
      return {latest,previous,avg,diff,count:items.length};
    }).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
  },[rows]);

  return <>
    <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 51 · PRIX FOURNISSEURS</p><h1>Historique des coûts</h1><p>Les prix validés depuis les factures fournisseurs servent de référence réelle aux devis et marges.</p></div><History/></div>
    <section className="v51-price-grid">{groups.map(g=><article key={g.latest.sku||g.latest.description}>
      <div><strong>{g.latest.description}</strong><small>{g.latest.sku||'Sans référence'} · {g.latest.supplier}</small></div>
      <b>{euro.format(g.latest.unitPriceHt)} HT</b>
      <span>Moyenne {euro.format(g.avg)}</span>
      <em className={g.diff>10?'bad':g.diff<0?'good':''}>{g.diff>0?<TrendingUp/>:g.diff<0?<TrendingDown/>:<BadgeEuro/>}{g.previous?`${g.diff>0?'+':''}${g.diff.toFixed(1)} %`:'1er prix'}</em>
      {g.diff>10&&<small className="warning-copy"><AlertTriangle/>Hausse supérieure à 10 %</small>}
    </article>)}</section>
    {!groups.length&&<section className="panel empty-state"><History/><strong>Aucun prix mémorisé</strong><p>Valide une facture fournisseur dans le scanner V51.</p></section>}
  </>;
}
