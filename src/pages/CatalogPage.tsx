import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { BookOpen, Copy, Download, Heart, Plus, Search, Trash2, Upload } from 'lucide-react';
import { createId } from '../lib/id';

type CatalogItem={
 id:string;code:string;label:string;category:string;unit:string;
 purchase:number;sale:number;vat:number;labor_minutes:number;favorite:boolean;created_at:string
};
const KEY='closerflow.catalog.v12.4';
const LEGACY_KEY='closerflow.catalog.v7';
const seed:CatalogItem[]=[
 {id:'cat-1',code:'PLB-001',label:'Remplacement mécanisme de chasse',category:'Plomberie',unit:'forfait',purchase:38,sale:145,vat:10,labor_minutes:60,favorite:true,created_at:new Date().toISOString()},
 {id:'cat-2',code:'SDB-001',label:'Pose meuble vasque',category:'Salle de bains',unit:'forfait',purchase:90,sale:390,vat:10,labor_minutes:180,favorite:false,created_at:new Date().toISOString()}
];
const normalize=(row:Partial<CatalogItem>):CatalogItem=>({
 id:row.id||createId(),code:String(row.code||''),label:String(row.label||''),category:String(row.category||'Autre'),unit:String(row.unit||'forfait'),
 purchase:Number(row.purchase)||0,sale:Number(row.sale)||0,vat:Number(row.vat)||0,labor_minutes:Number(row.labor_minutes)||0,
 favorite:Boolean(row.favorite),created_at:row.created_at||new Date().toISOString()
});
const load=()=>{try{const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY);const parsed=raw?JSON.parse(raw):seed;return Array.isArray(parsed)?parsed.map(normalize):seed}catch{return seed}};
const csvEscape=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
const download=(name:string,content:string,type='text/csv;charset=utf-8')=>{const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)};
const parseCsvLine=(line:string)=>{const values:string[]=[];let current='';let quoted=false;for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++}else quoted=!quoted}else if(char===','&&!quoted){values.push(current);current=''}else current+=char}values.push(current);return values};

export function CatalogPage(){
 const [items,setItems]=useState<CatalogItem[]>(load);const [q,setQ]=useState('');const [category,setCategory]=useState('Toutes');const [favoritesOnly,setFavoritesOnly]=useState(false);const fileRef=useRef<HTMLInputElement>(null);
 const [form,setForm]=useState({code:'',label:'',category:'Plomberie',unit:'forfait',purchase:0,sale:0,vat:10,labor_minutes:60});
 const save=(rows:CatalogItem[])=>{setItems(rows);localStorage.setItem(KEY,JSON.stringify(rows))};
 const categories=useMemo(()=>['Toutes',...Array.from(new Set(items.map(x=>x.category).filter(Boolean))).sort()],[items]);
 const filtered=useMemo(()=>items.filter(x=>{
  const matches=(x.code+' '+x.label+' '+x.category+' '+x.unit).toLowerCase().includes(q.toLowerCase());
  return matches&&(category==='Toutes'||x.category===category)&&(!favoritesOnly||x.favorite)
 }).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.label.localeCompare(b.label)),[items,q,category,favoritesOnly]);
 const totalMargin=items.reduce((s,x)=>s+(x.sale-x.purchase),0);const avgMargin=items.length?items.reduce((s,x)=>s+(x.sale?((x.sale-x.purchase)/x.sale)*100:0),0)/items.length:0;const totalLabor=items.reduce((s,x)=>s+x.labor_minutes,0);
 const add=()=>{if(!form.label.trim())return;save([normalize({...form,id:createId(),created_at:new Date().toISOString()}),...items]);setForm({...form,code:'',label:'',purchase:0,sale:0})};
 const exportCsv=()=>{const header=['code','designation','categorie','unite','achat_ht','vente_ht','tva','temps_pose_minutes','favori'];const rows=items.map(x=>[x.code,x.label,x.category,x.unit,x.purchase,x.sale,x.vat,x.labor_minutes,x.favorite?'oui':'non'].map(csvEscape).join(','));download(`closerflow-ouvrages-${new Date().toISOString().slice(0,10)}.csv`,[header.join(','),...rows].join('\n'))};
 const importCsv=async(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();const lines=text.split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('Fichier vide');const headers=parseCsvLine(lines[0]).map(h=>h.trim().toLowerCase());const imported=lines.slice(1).map(line=>{const values=parseCsvLine(line);const get=(...names:string[])=>{const i=headers.findIndex(h=>names.includes(h));return i>=0?values[i]:''};return normalize({code:get('code'),label:get('designation','label','désignation'),category:get('categorie','catégorie','category')||'Autre',unit:get('unite','unité','unit')||'forfait',purchase:Number(get('achat_ht','purchase'))||0,sale:Number(get('vente_ht','sale'))||0,vat:Number(get('tva','vat'))||0,labor_minutes:Number(get('temps_pose_minutes','labor_minutes'))||0,favorite:['oui','true','1'].includes(get('favori','favorite').toLowerCase())})}).filter(x=>x.label);if(!imported.length)throw new Error('Aucun ouvrage reconnu');save([...imported,...items]);alert(`${imported.length} ouvrage(s) importé(s).`)}catch(err){alert(err instanceof Error?err.message:'Import impossible')}finally{e.target.value=''}};
 return <><div className="page-title"><div><p className="eyebrow">V12.4 · CHIFFRAGE</p><h1>Bibliothèque d’ouvrages</h1></div><BookOpen/></div>
 <div className="stats-grid"><div className="stat-card"><small>Ouvrages</small><strong>{items.length}</strong></div><div className="stat-card"><small>Marge moyenne</small><strong>{avgMargin.toFixed(1)} %</strong></div><div className="stat-card"><small>Marge unitaire cumulée</small><strong>{totalMargin.toFixed(0)} €</strong></div><div className="stat-card"><small>Temps de pose cumulé</small><strong>{(totalLabor/60).toFixed(1)} h</strong></div></div>
 <section className="panel"><div className="section-heading"><div><h2>Ajouter un ouvrage</h2><p>Prix, temps de pose et marge calculés automatiquement.</p></div></div><div className="form-grid">
 {(['code','label','category','unit'] as const).map(k=><label key={k}>{k==='code'?'Code':k==='label'?'Désignation':k==='category'?'Catégorie':'Unité'}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
 {(['purchase','sale','vat','labor_minutes'] as const).map(k=><label key={k}>{k==='purchase'?'Prix achat HT':k==='sale'?'Prix vente HT':k==='vat'?'TVA %':'Temps de pose (min)'}<input min="0" type="number" value={form[k]} onChange={e=>setForm({...form,[k]:Number(e.target.value)})}/></label>)}
 </div><button className="primary-button" onClick={add}><Plus/>Ajouter l’ouvrage</button></section>
 <section className="panel"><div className="section-heading"><div><h2>Catalogue</h2><p>{filtered.length} résultat(s) affiché(s)</p></div><div className="row-actions"><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importCsv}/><button className="ghost small" onClick={()=>fileRef.current?.click()}><Upload/>Importer CSV</button><button className="ghost small" onClick={exportCsv}><Download/>Exporter CSV</button></div></div>
 <div className="form-grid catalog-filters"><label>Recherche<div className="search-box"><Search/><input placeholder="Code, désignation, catégorie…" value={q} onChange={e=>setQ(e.target.value)}/></div></label><label>Catégorie<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={favoritesOnly} onChange={e=>setFavoritesOnly(e.target.checked)}/>Favoris uniquement</label></div>
 <div className="list-stack">{filtered.map(x=>{const margin=x.sale-x.purchase;const marginRate=x.sale?margin/x.sale*100:0;return <article className="list-card catalog-card" key={x.id}><button className={`icon-button ${x.favorite?'favorite-active':''}`} title="Favori" onClick={()=>save(items.map(i=>i.id===x.id?{...i,favorite:!i.favorite}:i))}><Heart fill={x.favorite?'currentColor':'none'}/></button><div className="catalog-main"><strong>{x.code?`${x.code} · `:''}{x.label}</strong><small>{x.category} · {x.unit} · TVA {x.vat}% · pose {(x.labor_minutes/60).toFixed(1)} h</small><p>Achat {x.purchase.toFixed(2)} € · Vente {x.sale.toFixed(2)} € · Marge {margin.toFixed(2)} € ({marginRate.toFixed(1)} %)</p></div><div className="row-actions"><button className="icon-button" title="Dupliquer" onClick={()=>save([{...x,id:createId(),code:x.code?`${x.code}-COPIE`:'',label:`${x.label} (copie)`,favorite:false,created_at:new Date().toISOString()},...items])}><Copy/></button><button className="icon-button danger" title="Supprimer" onClick={()=>confirm('Supprimer cet ouvrage ?')&&save(items.filter(i=>i.id!==x.id))}><Trash2/></button></div></article>})}{!filtered.length&&<div className="empty-state"><BookOpen/><strong>Aucun ouvrage trouvé</strong><span>Modifie les filtres ou ajoute un nouvel ouvrage.</span></div>}</div></section></>
}
