import { ArrowLeft, CheckCircle2, CircleAlert, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

export function MissionCloseoutPage(){
 const {id}=useParams();const navigate=useNavigate();const {missions,validateMissionCloseout}=useAppData();const m=missions.find(x=>x.id===id);
 const [name,setName]=useState(m?.signature?.signer_name??'');const [comment,setComment]=useState(m?.closeout?.customer_comment??'');const [rating,setRating]=useState(m?.closeout?.satisfaction??5);
 if(!m)return <p>Mission introuvable.</p>;
 const checks=[['Toutes les tâches sont terminées',(m.tasks??[]).length>0&&(m.tasks??[]).every(t=>t.done)],['Une photo avant est présente',(m.photos??[]).some(p=>p.category==='before')],['Une photo après est présente',(m.photos??[]).some(p=>p.category==='after')],['La signature client est recueillie',!!m.signature]] as const;
 const ready=checks.every(x=>x[1]);
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(!ready&&!confirm('Certains contrôles sont incomplets. Valider quand même ?'))return;validateMissionCloseout(m.id,name.trim()||m.signature?.signer_name||'Client',comment.trim(),rating);navigate(`/missions/${m.id}/report`)};
 return <><div className="page-title"><div><p className="eyebrow">CLÔTURE CHANTIER</p><h1>{m.title}</h1></div><Link className="ghost" to={`/missions/${m.id}`}><ArrowLeft/>Retour</Link></div>
 <section className={`detail-card closeout-status ${ready?'ready':'warning'}`}><h2>{ready?'Prêt à clôturer':'Contrôles à terminer'}</h2>{checks.map(([label,ok])=><div className="closeout-check" key={label}>{ok?<CheckCircle2/>:<CircleAlert/>}<span>{label}</span></div>)}</section>
 <form className="form-card" onSubmit={submit}><label>Nom du valideur<input value={name} onChange={e=>setName(e.target.value)} placeholder="Nom du client ou responsable"/></label><label>Commentaire client<textarea rows={4} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Observations, réserves ou satisfaction…"/></label><div><span className="field-label">Satisfaction</span><div className="rating-row">{[1,2,3,4,5].map(v=><button type="button" className={v<=rating?'selected':''} onClick={()=>setRating(v)} key={v}><Star/></button>)}</div></div><button className="primary full"><CheckCircle2/>Valider la fin de chantier</button></form></>;
}
