import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, FilePlus2, ImagePlus, Ruler, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { createId } from '../lib/id';
import type { DocumentLine } from '../types/domain';

type PhotoItem={id:string;name:string;dataUrl:string;width:number;height:number;brightness:number;createdAt:string};
type Suggestion={label:string;unit:string;quantity:number;unitPrice:number;reason:string};

const rules=[
 {keys:['fuite','humidité','moisi','moisissure'],items:[['Recherche de fuite','forfait',1,280],['Reprise locale après fuite','forfait',1,420]],warnings:['Localiser précisément l’origine avant de refermer','Prévoir un temps de séchage avant finitions']},
 {keys:['douche','receveur','paroi'],items:[['Dépose de la douche existante','forfait',1,320],['Fourniture et pose d’un receveur','u',1,980],['Étanchéité sous carrelage','m²',4,68],['Pose de paroi de douche','u',1,360]],warnings:['Contrôler les pentes et le diamètre d’évacuation','Vérifier l’aplomb des murs']},
 {keys:['carrelage','faïence'],items:[['Préparation du support','m²',1,22],['Pose de carrelage ou faïence','m²',1,62],['Joints et finitions','m²',1,14]],warnings:['Ajouter les découpes et pertes de matériau','Contrôler la planéité du support']},
 {keys:['placo','cloison','doublage'],items:[['Ossature et plaques de plâtre','m²',1,58],['Bandes et enduits','m²',1,26],['Protection et nettoyage','forfait',1,95]],warnings:['Identifier les réseaux cachés','Adapter les plaques aux pièces humides']},
 {keys:['peinture','mur','plafond'],items:[['Préparation des supports','m²',1,18],['Peinture deux couches','m²',1,32]],warnings:['Valider l’état du support et le niveau de finition attendu']},
 {keys:['wc','toilette'],items:[['Dépose de l’ancien WC','u',1,120],['Pose et raccordement d’un WC','u',1,520]],warnings:['Contrôler l’entraxe et l’évacuation existante']},
 {keys:['chauffe-eau','ballon'],items:[['Dépose de l’ancien chauffe-eau','forfait',1,190],['Fourniture et pose chauffe-eau','u',1,1280],['Raccordements et essais','forfait',1,240]],warnings:['Contrôler l’alimentation électrique et le groupe de sécurité']},
];

function analyseText(text:string,surface:number){
 const lower=text.toLowerCase(); const suggestions:Suggestion[]=[]; const warnings:string[]=[];
 for(const rule of rules){if(rule.keys.some(k=>lower.includes(k))){for(const [label,unit,q,p] of rule.items as [string,string,number,number][]){suggestions.push({label,unit,quantity:unit==='m²'?Math.max(1,surface):q,unitPrice:p,reason:`Détecté dans les observations : ${rule.keys.find(k=>lower.includes(k))}`})}warnings.push(...rule.warnings)}}
 if(!suggestions.length&&text.trim()) suggestions.push({label:'Intervention à préciser après visite technique',unit:'forfait',quantity:1,unitPrice:350,reason:'Aucun ouvrage standard identifié automatiquement'});
 return {suggestions,warnings:[...new Set(warnings)]};
}

async function readPhoto(file:File):Promise<PhotoItem>{
 const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)});
 const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image illisible'));img.src=dataUrl});
 const canvas=document.createElement('canvas');const max=80;const ratio=Math.min(1,max/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
 const ctx=canvas.getContext('2d');let brightness=0;if(ctx){ctx.drawImage(image,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=(pixels[i]+pixels[i+1]+pixels[i+2])/3;brightness=Math.round(sum/(pixels.length/4))}
 return {id:createId(),name:file.name,dataUrl,width:image.width,height:image.height,brightness,createdAt:new Date().toISOString()};
}

export function VisionEstimatorPage(){
 const {clients,missions,addQuote}=useAppData(); const navigate=useNavigate(); const inputRef=useRef<HTMLInputElement>(null);
 const [photos,setPhotos]=useState<PhotoItem[]>([]); const [notes,setNotes]=useState(''); const [surface,setSurface]=useState(0); const [clientId,setClientId]=useState(''); const [missionId,setMissionId]=useState(''); const [vat,setVat]=useState(10); const [message,setMessage]=useState('');
 const analysis=useMemo(()=>analyseText(notes,surface),[notes,surface]);
 const photoWarnings=useMemo(()=>photos.flatMap(p=>p.brightness<45?[`${p.name} est sombre : reprendre une photo avec plus de lumière.`]:p.brightness>235?[`${p.name} est surexposée : les détails peuvent être perdus.`]:[]),[photos]);
 const total=analysis.suggestions.reduce((s,x)=>s+x.quantity*x.unitPrice,0);
 async function onFiles(files:FileList|null){if(!files)return;const selected=[...files].filter(f=>f.type.startsWith('image/')).slice(0,8-photos.length);const parsed=await Promise.all(selected.map(readPhoto));setPhotos(x=>[...x,...parsed]);}
 function createDraft(){if(!analysis.suggestions.length){setMessage('Ajoute des observations avant de créer le devis.');return}const lines:DocumentLine[]=analysis.suggestions.map(x=>({id:createId(),description:x.label,quantity:x.quantity,unit:x.unit,unit_price_ht:x.unitPrice}));const quote=addQuote({client_id:clientId||null,mission_id:missionId||null,title:`Pré-devis vision chantier${missionId?' - '+missions.find(m=>m.id===missionId)?.title:''}`,status:'draft',vat_rate:vat,discount_percent:0,lines});setMessage(`Brouillon ${quote.number} créé.`);setTimeout(()=>navigate(`/quotes/${quote.id}`),500)}
 return <div className="vision-page">
  <div className="page-title"><div><p className="eyebrow">CLOSERFLOW v11.4</p><h1>Assistant Vision chantier</h1><p className="muted">Photos, observations guidées et pré-devis local. Aucune image n’est envoyée vers un service externe.</p></div><WandSparkles/></div>
  <section className="assistant-card vision-upload"><div><h2><Camera/> Photos du chantier</h2><p>Ajoute jusqu’à 8 photos. Le module contrôle la qualité visuelle et conserve les images seulement dans cette session.</p></div><button className="primary" onClick={()=>inputRef.current?.click()}><ImagePlus/> Ajouter des photos</button><input ref={inputRef} hidden type="file" accept="image/*" capture="environment" multiple onChange={e=>onFiles(e.target.files)}/></section>
  {photos.length>0&&<div className="vision-gallery">{photos.map(p=><article key={p.id}><img src={p.dataUrl} alt={p.name}/><div><strong>{p.name}</strong><small>{p.width} × {p.height}px · luminosité {p.brightness}/255</small></div><button className="icon-button danger" onClick={()=>setPhotos(x=>x.filter(y=>y.id!==p.id))}><Trash2/></button></article>)}</div>}
  <div className="vision-grid"><section className="assistant-card"><h2><Sparkles/> Observations du chantier</h2><label>Description détaillée<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex. douche à déposer, traces d’humidité, 12 m² de faïence, mur à reprendre en placo…"/></label><label><Ruler/> Surface concernée (m²)<input type="number" min="0" step="0.5" value={surface||''} onChange={e=>setSurface(Number(e.target.value))}/></label><div className="form-grid"><label>Client<select value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Non défini</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name||`${c.first_name} ${c.last_name}`}</option>)}</select></label><label>Chantier<select value={missionId} onChange={e=>setMissionId(e.target.value)}><option value="">Non défini</option>{missions.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>TVA (%)<input type="number" value={vat} onChange={e=>setVat(Number(e.target.value))}/></label></div></section>
  <section className="assistant-card"><h2><FilePlus2/> Pré-chiffrage suggéré</h2>{analysis.suggestions.length===0?<p className="empty-state">Décris les travaux pour générer des lignes.</p>:<div className="vision-lines">{analysis.suggestions.map((s,i)=><article key={`${s.label}-${i}`}><div><strong>{s.label}</strong><small>{s.reason}</small></div><span>{s.quantity} {s.unit}</span><b>{(s.quantity*s.unitPrice).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</b></article>)}<footer><span>Total HT indicatif</span><strong>{total.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</strong></footer></div>}<button className="primary full" onClick={createDraft}><FilePlus2/> Créer le brouillon de devis</button>{message&&<p className="success-message">{message}</p>}</section></div>
  <div className="vision-grid"><section className="assistant-card"><h2><AlertTriangle/> Points à vérifier</h2>{[...photoWarnings,...analysis.warnings].length?[...photoWarnings,...analysis.warnings].map(x=><p className="vision-check warning" key={x}>• {x}</p>):<p className="vision-check"><CheckCircle2/> Aucun avertissement automatique.</p>}</section><section className="assistant-card"><h2><CheckCircle2/> Limites et validation</h2><p className="vision-check">• Les matériaux ne sont pas reconnus automatiquement avec certitude.</p><p className="vision-check">• Les quantités dépendent de la surface saisie et des observations.</p><p className="vision-check">• Le devis doit être contrôlé après visite, mesures et vérification des réseaux.</p></section></div>
 </div>;
}
