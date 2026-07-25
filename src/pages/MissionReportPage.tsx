import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

function durationLabel(start:string|null,end:string|null){
 if(!start||!end)return 'Durée non renseignée';
 const minutes=Math.max(0,Math.round((new Date(end).getTime()-new Date(start).getTime())/60000));
 const hours=Math.floor(minutes/60),rest=minutes%60;
 return hours?`${hours} h ${String(rest).padStart(2,'0')}`:`${rest} min`;
}

export function MissionReportPage(){
 const {id}=useParams();const {missions,company}=useAppData();const m=missions.find(x=>x.id===id);
 if(!m)return <p>Rapport introuvable.</p>;
 const name=m.client?(m.client.company_name||`${m.client.first_name} ${m.client.last_name}`):'Client';
 const completed=(m.tasks??[]).filter(t=>t.done).length;
 return <div className="report-page"><div className="report-actions"><Link className="ghost" to={`/missions/${m.id}`}><ArrowLeft/>Retour</Link><button className="primary" onClick={()=>window.print()}><Printer/>Imprimer / PDF</button></div><article className="report-sheet">
 <header><div className="report-logo">C</div><div><h1>Rapport d’intervention</h1><p>{company.name}</p><p>{[company.address,company.phone,company.email].filter(Boolean).join(' • ')}</p><p>{[company.siret&&`SIRET ${company.siret}`,company.vat_number&&`TVA ${company.vat_number}`].filter(Boolean).join(' • ')}</p></div></header>
 <section className="report-info"><div><small>CLIENT</small><strong>{name}</strong><span>{m.address||'Adresse non renseignée'}</span></div><div><small>INTERVENTION</small><strong>{m.title}</strong><span>{m.started_at?new Date(m.started_at).toLocaleString('fr-FR'):'Date non renseignée'}</span><span>{durationLabel(m.started_at,m.finished_at)}</span></div></section>
 <section><h2>Travaux réalisés</h2><p>{m.description||'Intervention réalisée conformément à la mission.'}</p>{(m.notes??[]).map(n=><p key={n.id}>• {n.text}</p>)}</section>
 {(m.tasks??[]).length>0&&<section><h2>Check-list ({completed}/{m.tasks!.length})</h2>{m.tasks!.map(task=><div className="report-row" key={task.id}><span>{task.done?'✓':'○'} {task.label}</span><strong>{task.done?'Terminé':'À faire'}</strong></div>)}</section>}
 <section><h2>Matériel utilisé</h2>{(m.materials??[]).length?(m.materials??[]).map(x=><div className="report-row" key={x.id}><span>{x.label}</span><strong>{x.quantity} {x.unit}</strong></div>):<p>Aucun matériel renseigné.</p>}</section>
 {(m.photos??[]).length>0&&<section><h2>Photos</h2><div className="report-photos">{(m.photos??[]).map(x=><figure key={x.id}><img src={x.data_url}/><figcaption>{x.category==='before'?'Avant':'Après'}{x.caption?` — ${x.caption}`:''}</figcaption></figure>)}</div></section>}
 {m.closeout&&<section><h2>Clôture et satisfaction</h2><div className="report-row"><span>Validation</span><strong>{new Date(m.closeout.validated_at).toLocaleString('fr-FR')}</strong></div><div className="report-row"><span>Validé par</span><strong>{m.closeout.validated_by}</strong></div><div className="report-row"><span>Satisfaction</span><strong>{'★'.repeat(m.closeout.satisfaction)}{'☆'.repeat(5-m.closeout.satisfaction)}</strong></div>{m.closeout.customer_comment&&<p><strong>Commentaire :</strong> {m.closeout.customer_comment}</p>}</section>}
 <section className="report-sign"><div><h2>Validation client</h2><p>{m.signature?`Signé par ${m.signature.signer_name} le ${new Date(m.signature.signed_at).toLocaleString('fr-FR')}`:'Signature non recueillie'}</p></div>{m.signature&&<img src={m.signature.data_url}/>}</section>
 </article></div>;
}
