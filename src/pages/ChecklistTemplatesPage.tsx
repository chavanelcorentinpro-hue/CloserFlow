import { ClipboardList, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext';

export function ChecklistTemplatesPage(){
 const {checklistTemplates,missions,addChecklistTemplate,deleteChecklistTemplate,applyChecklistTemplate}=useAppData();
 const [missionId,setMissionId]=useState(missions[0]?.id??'');
 const active=useMemo(()=>missions.filter(m=>m.status!=='archived'),[missions]);
 const submit=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=new FormData(e.currentTarget);const tasks=String(f.get('tasks')||'').split('\n').map(x=>x.trim()).filter(Boolean);if(!tasks.length)return alert('Ajoute au moins une tâche.');addChecklistTemplate(String(f.get('name')),String(f.get('description')||''),tasks);e.currentTarget.reset()};
 return <><div className="page-title"><div><p className="eyebrow">CHANTIER MOBILE</p><h1>Modèles de check-list</h1><p>Crée une procédure et applique-la en un clic à une mission.</p></div></div>
 <form className="form-card checklist-builder" onSubmit={submit}><label>Nom du modèle<input name="name" required placeholder="Ex. Mise en service chauffe-eau"/></label><label>Description<input name="description" placeholder="Utilisation du modèle"/></label><label>Tâches, une par ligne<textarea name="tasks" required rows={6} placeholder={'Couper l’alimentation\nContrôler les raccords\nTester l’étanchéité'}/></label><button className="primary"><Plus/>Créer le modèle</button></form>
 <section className="detail-card"><div className="section-inline"><div><p className="eyebrow">Application rapide</p><strong>Choisir une mission</strong></div><select value={missionId} onChange={e=>setMissionId(e.target.value)}>{active.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></div></section>
 <div className="template-list">{checklistTemplates.map(t=><article className="template-card" key={t.id}><div className="template-icon"><ClipboardList/></div><div><h3>{t.name}</h3><p>{t.description||'Aucune description'}</p><ol>{t.tasks.map((task,i)=><li key={`${t.id}-${i}`}>{task}</li>)}</ol></div><div className="template-actions"><button className="primary" disabled={!missionId} onClick={()=>{applyChecklistTemplate(t.id,missionId);alert('Check-list ajoutée à la mission.')}}><PlayCircle/>Appliquer</button><button className="ghost" onClick={()=>confirm('Supprimer ce modèle ?')&&deleteChecklistTemplate(t.id)}><Trash2/></button></div></article>)}</div></>;
}
