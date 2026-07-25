import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, Download, Save, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData, type BackupPayload } from '../context/AppDataContext';

export function SettingsPage(){
 const {company,updateCompany,exportBackup,importBackup}=useAppData();
 const [form,setForm]=useState(company); const [message,setMessage]=useState('');
 const fileRef=useRef<HTMLInputElement>(null);
 const save=(event:FormEvent)=>{event.preventDefault();updateCompany(form);setMessage('Paramètres enregistrés');};
 const download=()=>{const payload=exportBackup();const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`closerflow-sauvegarde-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);};
 const restore=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text()) as BackupPayload;importBackup(payload);setForm(payload.company);setMessage('Sauvegarde restaurée avec succès');}catch(error){setMessage(error instanceof Error?error.message:'Fichier invalide');}finally{event.target.value='';}};
 return <><div className="page-title settings-title"><Link className="ghost" to="/more"><ArrowLeft/>Retour</Link><div><p className="eyebrow">CONFIGURATION</p><h1>Paramètres</h1></div></div>
 <form className="form-card" onSubmit={save}><h2>Mon entreprise</h2>
  <label>Nom de l’entreprise<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
  <div className="two-cols"><label>SIRET<input value={form.siret} onChange={e=>setForm({...form,siret:e.target.value})}/></label><label>Numéro de TVA<input value={form.vat_number} onChange={e=>setForm({...form,vat_number:e.target.value})}/></label></div>
  <div className="two-cols"><label>Téléphone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>E-mail<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label></div>
  <label>Adresse<textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
  <button className="primary full" type="submit"><Save/>Enregistrer</button></form>
 <section className="detail-card backup-card"><h2>Sauvegarde locale</h2><p>Exporte toutes les données, photos et signatures dans un fichier JSON. Conserve-le dans Google Drive ou sur un PC.</p>
  <div className="backup-actions"><button className="primary" onClick={download}><Download/>Exporter</button><button className="ghost" onClick={()=>fileRef.current?.click()}><Upload/>Restaurer</button></div>
  <input ref={fileRef} className="hidden-input" type="file" accept="application/json,.json" onChange={restore}/>{message&&<p className="save-message">{message}</p>}</section></>;
}
