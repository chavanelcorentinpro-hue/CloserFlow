import { useMemo, useState } from 'react';
import { Clock3, Play, Square, Trash2, UserRoundCheck } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

const minutesBetween=(start:string,end:string|null)=>Math.max(0,Math.round(((end?+new Date(end):Date.now())-+new Date(start))/60000));
const euro=(value:number)=>value.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});

export function TimeTrackingPage(){
 const {missions,team,timeEntries,startTimer,stopTimer,addTimeEntry,deleteTimeEntry}=useAppData();
 const activeTeam=team.filter(member=>member.active);
 const [missionId,setMissionId]=useState(missions[0]?.id??'');
 const [userId,setUserId]=useState(activeTeam[0]?.id??'');
 const [hourlyCost,setHourlyCost]=useState(30);
 const [note,setNote]=useState('');
 const [manualMinutes,setManualMinutes]=useState(60);
 const active=timeEntries.filter(entry=>!entry.ended_at);
 const totals=useMemo(()=>{
  const rows=timeEntries.filter(entry=>entry.ended_at);
  const minutes=rows.reduce((sum,entry)=>sum+minutesBetween(entry.started_at,entry.ended_at),0);
  const cost=rows.reduce((sum,entry)=>sum+(minutesBetween(entry.started_at,entry.ended_at)/60)*entry.hourly_cost,0);
  return {minutes,cost};
 },[timeEntries]);
 function begin(){if(!missionId)return;try{startTimer(missionId,hourlyCost,note,userId||null);setNote('')}catch(error){alert(error instanceof Error?error.message:'Impossible de démarrer')}}
 function addManual(){if(!missionId||manualMinutes<=0)return;addTimeEntry(missionId,manualMinutes,hourlyCost,note,userId||null);setNote('')}
 return <><div className="page-title"><div><p className="eyebrow">CHANTIER</p><h1>Pointage équipe</h1><p className="muted-copy">Chronomètres par collaborateur et heures manuelles.</p></div><Clock3/></div>
 <div className="report-kpis time-kpis"><article><span>Temps enregistré</span><strong>{Math.floor(totals.minutes/60)} h {totals.minutes%60} min</strong></article><article><span>Coût main-d’œuvre</span><strong>{euro(totals.cost)}</strong></article><article><span>Chronomètres actifs</span><strong>{active.length}</strong></article></div>
 <section className="panel"><h2>Nouveau pointage</h2><div className="time-tracking-form"><label>Chantier<select value={missionId} onChange={e=>setMissionId(e.target.value)}>{missions.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>Collaborateur<select value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Non attribué</option>{activeTeam.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Coût horaire<input type="number" min="0" step="0.5" value={hourlyCost} onChange={e=>setHourlyCost(Number(e.target.value))}/></label><label className="wide">Note<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex. Pose du réseau EF/EC"/></label><button className="primary-button" onClick={begin} disabled={!missionId}><Play/>Démarrer</button><label>Durée manuelle (min)<input type="number" min="1" value={manualMinutes} onChange={e=>setManualMinutes(Number(e.target.value))}/></label><button className="ghost" onClick={addManual} disabled={!missionId}>Ajouter l’heure</button></div></section>
 {active.length>0&&<section><div className="section-heading"><div><h2>En cours</h2></div></div><div className="active-time-list">{active.map(entry=>{const mission=missions.find(m=>m.id===entry.mission_id);const member=team.find(m=>m.id===entry.user_id);return <article key={entry.id}><div className="time-avatar"><UserRoundCheck/></div><div><strong>{member?.name??'Non attribué'}</strong><span>{mission?.title??'Chantier supprimé'} · démarré à {new Date(entry.started_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>{entry.note&&<small>{entry.note}</small>}</div><button className="danger-button" onClick={()=>stopTimer(entry.id)}><Square/>Arrêter</button></article>})}</div></section>}
 <section><div className="section-heading"><div><h2>Historique</h2></div></div><div className="time-history">{timeEntries.filter(entry=>entry.ended_at).map(entry=>{const mission=missions.find(m=>m.id===entry.mission_id);const member=team.find(m=>m.id===entry.user_id);const mins=minutesBetween(entry.started_at,entry.ended_at);return <article key={entry.id}><div><strong>{mission?.title??'Chantier supprimé'}</strong><span>{member?.name??'Non attribué'} · {new Date(entry.started_at).toLocaleDateString('fr-FR')}</span><small>{Math.floor(mins/60)} h {mins%60} min · {euro((mins/60)*entry.hourly_cost)}{entry.note?` · ${entry.note}`:''}</small></div><button className="icon-danger" onClick={()=>confirm('Supprimer ce pointage ?')&&deleteTimeEntry(entry.id)}><Trash2/></button></article>})}</div></section></>;
}
