import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, Download, FileText, FolderOpen, Image, Plus, Printer, Search, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { createId } from '../lib/id';

type DocumentCategory = 'photo_before' | 'photo_during' | 'photo_after' | 'quote' | 'invoice' | 'plan' | 'warranty' | 'notice' | 'insurance' | 'other';
type StoredDocument = {
  id:string;
  mission_id:string | null;
  name:string;
  category:DocumentCategory;
  mime_type:string;
  size:number;
  data_url:string;
  notes:string;
  tags:string[];
  warranty_expires_at:string | null;
  created_at:string;
};

const STORAGE_KEY='closerflow_documents_v9';
const categories:Record<DocumentCategory,string>={
  photo_before:'Photo avant',photo_during:'Photo pendant',photo_after:'Photo après',quote:'Devis',invoice:'Facture',plan:'Plan',warranty:'Garantie',notice:'Notice',insurance:'Assurance',other:'Autre'
};
function loadDocuments():StoredDocument[]{try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):[]}catch{return []}}
function formatBytes(value:number){if(value<1024)return `${value} o`;if(value<1024*1024)return `${(value/1024).toFixed(1)} Ko`;return `${(value/1024/1024).toFixed(1)} Mo`}
function download(doc:StoredDocument){const a=document.createElement('a');a.href=doc.data_url;a.download=doc.name;a.click()}

export function DocumentManagementPage(){
 const {missions,clients,company}=useAppData();
 const [documents,setDocuments]=useState<StoredDocument[]>(loadDocuments);
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState<'all'|DocumentCategory>('all');
 const [missionFilter,setMissionFilter]=useState('all');
 const [formMission,setFormMission]=useState('');
 const [formCategory,setFormCategory]=useState<DocumentCategory>('other');
 const [notes,setNotes]=useState('');
 const [tags,setTags]=useState('');
 const [warrantyDate,setWarrantyDate]=useState('');
 const [files,setFiles]=useState<File[]>([]);
 const [message,setMessage]=useState('');
 useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(documents))},[documents]);
 const missionName=(id:string|null)=>id?missions.find(m=>m.id===id)?.title??'Chantier supprimé':'Sans chantier';
 const filtered=useMemo(()=>documents.filter(doc=>{
  const haystack=`${doc.name} ${doc.notes} ${doc.tags.join(' ')} ${missionName(doc.mission_id)}`.toLowerCase();
  return (!query.trim()||haystack.includes(query.toLowerCase()))&&(category==='all'||doc.category===category)&&(missionFilter==='all'||doc.mission_id===missionFilter);
 }),[documents,query,category,missionFilter,missions]);
 const stats=useMemo(()=>({total:documents.length,photos:documents.filter(d=>d.mime_type.startsWith('image/')).length,warranties:documents.filter(d=>d.category==='warranty').length,size:documents.reduce((s,d)=>s+d.size,0)}),[documents]);
 async function addDocuments(event:FormEvent){event.preventDefault();if(!files.length){setMessage('Sélectionne au moins un fichier.');return}const next:StoredDocument[]=[];for(const file of files){const dataUrl=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(file)});next.push({id:createId(),mission_id:formMission||null,name:file.name,category:formCategory,mime_type:file.type||'application/octet-stream',size:file.size,data_url:dataUrl,notes:notes.trim(),tags:tags.split(',').map(x=>x.trim()).filter(Boolean),warranty_expires_at:formCategory==='warranty'&&warrantyDate?warrantyDate:null,created_at:new Date().toISOString()})}setDocuments(rows=>[...next,...rows]);setFiles([]);setNotes('');setTags('');setWarrantyDate('');setMessage(`${next.length} document(s) ajouté(s).`)}
 function onFiles(event:ChangeEvent<HTMLInputElement>){setFiles(Array.from(event.target.files??[]))}
 function remove(id:string){if(confirm('Supprimer définitivement ce document local ?'))setDocuments(rows=>rows.filter(d=>d.id!==id))}
 function printReport(){window.print()}
 const reportMission=missionFilter!=='all'?missions.find(m=>m.id===missionFilter):null;
 const reportClient=reportMission?.client_id?clients.find(c=>c.id===reportMission.client_id):null;
 return <div className="document-v9-page">
  <div className="page-title no-print"><div><p className="eyebrow">CLOSERFLOW V9</p><h1>Gestion documentaire</h1><p>Le dossier numérique complet de chaque chantier, stocké localement.</p></div><button onClick={printReport}><Printer/>Imprimer le rapport</button></div>
  <section className="document-stats no-print"><article><FolderOpen/><div><strong>{stats.total}</strong><span>documents</span></div></article><article><Image/><div><strong>{stats.photos}</strong><span>photos</span></div></article><article><ShieldCheck/><div><strong>{stats.warranties}</strong><span>garanties</span></div></article><article><Archive/><div><strong>{formatBytes(stats.size)}</strong><span>stockés localement</span></div></article></section>
  <section className="form-card no-print"><div className="section-heading"><div><p className="eyebrow">AJOUT RAPIDE</p><h2>Classer de nouveaux fichiers</h2></div><Upload/></div><form className="document-upload-form" onSubmit={addDocuments}><label>Chantier<select value={formMission} onChange={e=>setFormMission(e.target.value)}><option value="">Sans chantier</option>{missions.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>Catégorie<select value={formCategory} onChange={e=>setFormCategory(e.target.value as DocumentCategory)}>{Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{formCategory==='warranty'&&<label>Fin de garantie<input type="date" value={warrantyDate} onChange={e=>setWarrantyDate(e.target.value)}/></label>}<label className="file-drop">Fichiers<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={onFiles}/><span><Plus/> {files.length?`${files.length} fichier(s) sélectionné(s)`:'Choisir des fichiers ou des photos'}</span></label><label>Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="chauffe-eau, SAV, plomberie"/></label><label className="document-notes">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Informations utiles, référence produit, emplacement…"/></label><button type="submit"><Upload/>Ajouter au dossier</button></form>{message&&<p className="success-message">{message}</p>}</section>
  <section className="document-browser no-print"><div className="document-toolbar"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un nom, un tag ou une note"/></label><select value={missionFilter} onChange={e=>setMissionFilter(e.target.value)}><option value="all">Tous les chantiers</option>{missions.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value as 'all'|DocumentCategory)}><option value="all">Toutes les catégories</option>{Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><div className="document-grid">{filtered.map(doc=><article className="document-card" key={doc.id}>{doc.mime_type.startsWith('image/')?<img src={doc.data_url} alt={doc.name}/>:<div className="document-file-icon"><FileText/></div>}<div className="document-card-body"><span className="document-category">{categories[doc.category]}</span><h3 title={doc.name}>{doc.name}</h3><p>{missionName(doc.mission_id)}</p>{doc.notes&&<small>{doc.notes}</small>}{doc.tags.length>0&&<div className="document-tags">{doc.tags.map(tag=><span key={tag}>{tag}</span>)}</div>}{doc.warranty_expires_at&&<strong className="warranty-date">Garantie jusqu’au {new Date(doc.warranty_expires_at).toLocaleDateString('fr-FR')}</strong>}<footer><span>{formatBytes(doc.size)} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span><div><button className="icon-button" onClick={()=>download(doc)} title="Télécharger"><Download/></button><button className="icon-button danger" onClick={()=>remove(doc.id)} title="Supprimer"><Trash2/></button></div></footer></div></article>)}{filtered.length===0&&<div className="empty-state"><FolderOpen/><h3>Aucun document</h3><p>Ajoute des photos, plans, factures ou garanties au dossier.</p></div>}</div></section>
  <section className="document-print-report"><header><div><h1>{company.name}</h1><p>Rapport documentaire CloserFlow</p></div><strong>{new Date().toLocaleDateString('fr-FR')}</strong></header><h2>{reportMission?reportMission.title:'Dossier documentaire global'}</h2>{reportMission&&<p><b>Client :</b> {reportClient?.company_name||[reportClient?.first_name,reportClient?.last_name].filter(Boolean).join(' ')||'Non renseigné'}<br/><b>Adresse :</b> {reportMission.address||reportClient?.address||'Non renseignée'}</p>}<table><thead><tr><th>Date</th><th>Document</th><th>Catégorie</th><th>Notes</th></tr></thead><tbody>{filtered.map(doc=><tr key={doc.id}><td>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td><td>{doc.name}</td><td>{categories[doc.category]}</td><td>{doc.notes||'—'}</td></tr>)}</tbody></table><footer>Rapport généré localement par CloserFlow v9.0.0 · {filtered.length} document(s)</footer></section>
 </div>
}
