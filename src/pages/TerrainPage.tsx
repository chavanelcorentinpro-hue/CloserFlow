import { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Clock3, FileText, MapPin, RefreshCw, Signal, SignalZero, UserRoundCheck } from 'lucide-react';
import { SignaturePad } from '../components/SignaturePad';
import { useAppData } from '../context/AppDataContext';

const QUEUE_KEY='closerflow_terrain_queue_v1';
type QueueItem={id:string;label:string;created_at:string};
const readQueue=():QueueItem[]=>{try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')}catch{return[]}};
const saveQueue=(rows:QueueItem[])=>localStorage.setItem(QUEUE_KEY,JSON.stringify(rows));

async function compressImage(file:File){
 const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)});
 const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=data});
 const max=1600, scale=Math.min(1,max/Math.max(img.width,img.height));
 const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
 c.getContext('2d')?.drawImage(img,0,0,c.width,c.height);
 return c.toDataURL('image/jpeg',.78);
}

export function TerrainPage(){
 const {missions,timeEntries,startTimer,stopTimer,addMissionPhoto,saveMissionSignature,company}=useAppData();
 const [missionId,setMissionId]=useState(missions[0]?.id??'');
 const [hourlyCost,setHourlyCost]=useState(25);
 const [photoKind,setPhotoKind]=useState<'before'|'after'>('before');
 const [caption,setCaption]=useState('');
 const [online,setOnline]=useState(navigator.onLine);
 const [queue,setQueue]=useState<QueueItem[]>(readQueue);
 const mission=missions.find(m=>m.id===missionId);
 const active=timeEntries.find(t=>t.mission_id===missionId&&!t.ended_at);
 const missionEntries=useMemo(()=>timeEntries.filter(t=>t.mission_id===missionId),[timeEntries,missionId]);
 const minutes=missionEntries.reduce((sum,t)=>sum+((new Date(t.ended_at??Date.now()).getTime()-new Date(t.started_at).getTime())/60000),0);
 useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);addEventListener('online',on);addEventListener('offline',off);return()=>{removeEventListener('online',on);removeEventListener('offline',off)}},[]);
 const queueAction=(label:string)=>{if(online)return;const next=[{id:crypto.randomUUID?.()??String(Date.now()),label,created_at:new Date().toISOString()},...queue];setQueue(next);saveQueue(next)};
 const sync=()=>{if(!online)return;setQueue([]);saveQueue([])};
 const photo=async(file?:File)=>{if(!file||!mission)return;const data=await compressImage(file);addMissionPhoto(mission.id,data,photoKind,caption.trim());queueAction(`Photo ${photoKind==='before'?'avant':'après'} — ${mission.title}`);setCaption('')};
 const printReport=()=>{if(!mission)return;const client=mission.client?[mission.client.first_name,mission.client.last_name,mission.client.company_name].filter(Boolean).join(' '):'Non renseigné';const w=open('','_blank');if(!w)return;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bon d'intervention</title><style>body{font:14px Arial;padding:32px;color:#111}h1{font-size:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #bbb;padding:12px;margin:12px 0}img{max-width:180px;max-height:130px;margin:6px}</style></head><body><h1>Bon d'intervention</h1><p><strong>${company.name}</strong><br>${company.address}<br>${company.phone} — ${company.email}</p><div class="box"><strong>Chantier :</strong> ${mission.title}<br><strong>Client :</strong> ${client}<br><strong>Adresse :</strong> ${mission.address??''}<br><strong>Temps pointé :</strong> ${Math.round(minutes)} min</div><h2>Photos</h2>${(mission.photos??[]).map(p=>`<img src="${p.data_url}" alt="${p.caption}">`).join('')}<h2>Signature client</h2>${mission.signature?`<p>${mission.signature.signer_name} — ${new Date(mission.signature.signed_at).toLocaleString('fr-FR')}</p><img src="${mission.signature.data_url}">`:'<p>Non signée</p>'}<script>print()</script></body></html>`);w.document.close()};
 return <><div className="page-title"><div><p className="eyebrow">APPLICATION TERRAIN</p><h1>Intervention mobile v9.1</h1></div><div className={`network-pill ${online?'online':'offline'}`}>{online?<Signal size={16}/>:<SignalZero size={16}/>} {online?'En ligne':'Hors connexion'}</div></div>
 <div className="terrain-layout"><section className="panel terrain-main"><label>Chantier<select value={missionId} onChange={e=>setMissionId(e.target.value)}>{missions.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>{mission&&<><div className="terrain-mission"><strong>{mission.title}</strong><span><MapPin size={16}/>{mission.address||'Adresse non renseignée'}</span></div><div className="terrain-actions"><div><label>Coût horaire<input type="number" min="0" value={hourlyCost} onChange={e=>setHourlyCost(Number(e.target.value))}/></label>{active?<button className="danger" onClick={()=>{stopTimer(active.id);queueAction(`Fin de pointage — ${mission.title}`)}}><Clock3/> Terminer le pointage</button>:<button className="primary" onClick={()=>{startTimer(mission.id,hourlyCost,'Intervention terrain');queueAction(`Début de pointage — ${mission.title}`)}}><Clock3/> Démarrer le pointage</button>}<small>{Math.round(minutes)} minutes enregistrées</small></div><div><label>Type de photo<select value={photoKind} onChange={e=>setPhotoKind(e.target.value as 'before'|'after')}><option value="before">Avant / pendant</option><option value="after">Après</option></select></label><input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Légende de la photo"/><label className="primary upload-button"><Camera/> Prendre ou choisir une photo<input hidden type="file" accept="image/*" capture="environment" onChange={e=>photo(e.target.files?.[0])}/></label></div></div><div className="terrain-gallery">{(mission.photos??[]).slice(-8).map(p=><figure key={p.id}><img src={p.data_url}/><figcaption>{p.caption||p.category}</figcaption></figure>)}</div><div className="terrain-signature"><h2><UserRoundCheck/> Signature client</h2><SignaturePad onSave={(data,name)=>{saveMissionSignature(mission.id,data,name);queueAction(`Signature client — ${mission.title}`)}}/>{mission.signature&&<p className="success-line"><CheckCircle2/> Signé par {mission.signature.signer_name}</p>}</div><button className="ghost report-button" onClick={printReport}><FileText/> Générer le bon d'intervention</button></>}</section>
 <aside className="panel sync-panel"><h2><RefreshCw/> Synchronisation</h2><p>Les actions restent enregistrées localement quand le réseau est coupé.</p><strong>{queue.length} action(s) en attente</strong>{queue.slice(0,6).map(q=><small key={q.id}>{q.label}</small>)}<button className="primary" disabled={!online||queue.length===0} onClick={sync}>Synchroniser maintenant</button></aside></div></>;
}
