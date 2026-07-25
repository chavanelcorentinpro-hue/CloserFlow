import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock3,
  Download, FileCheck2, Gauge, MapPinned, PackageCheck, Plus, ShieldAlert,
  ShieldCheck, Target, UserRoundCheck, Users, Wrench
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { createId } from '../lib/id';

type TicketPriority='low'|'normal'|'high'|'urgent';
type TicketStatus='new'|'assigned'|'in_progress'|'waiting'|'done'|'cancelled';
type ActionStatus='open'|'done';

type ServiceTicket={
  id:string; title:string; client_id:string|null; mission_id:string|null; assignee_id:string|null;
  priority:TicketPriority; status:TicketStatus; due_at:string|null; description:string; created_at:string; updated_at:string;
};
type QualityInspection={
  id:string; mission_id:string; inspector:string; safety:number; finish:number; cleanliness:number; documentation:number;
  nonconformities:string[]; comment:string; created_at:string;
};
type CorrectiveAction={
  id:string; mission_id:string|null; ticket_id:string|null; title:string; owner_id:string|null; due_at:string|null;
  status:ActionStatus; severity:'info'|'warning'|'critical'; created_at:string;
};

const TICKET_KEY='closerflow.v13_8.fieldTickets';
const INSPECTION_KEY='closerflow.v13_8.qualityInspections';
const ACTION_KEY='closerflow.v13_8.correctiveActions';
const SLA_KEY='closerflow.v13_8.slaHours';
const read=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}};
const save=<T,>(key:string,value:T)=>localStorage.setItem(key,JSON.stringify(value));
const fmtDate=(value:string|null)=>value?new Date(value).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
const csvCell=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;
const download=(name:string,content:string)=>{const blob=new Blob([content],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)};

function scoreInspection(i:QualityInspection){return Math.round((i.safety+i.finish+i.cleanliness+i.documentation)/4)}
function priorityWeight(p:TicketPriority){return p==='urgent'?4:p==='high'?3:p==='normal'?2:1}

export function FieldOpsPage(){
  const {clients,missions,team,timeEntries,siteJournalEntries,inventory,updateMissionStatus,assignMission,addMissionNote}=useAppData();
  const [tab,setTab]=useState<'dispatch'|'tickets'|'quality'|'actions'>('dispatch');
  const [tickets,setTickets]=useState<ServiceTicket[]>(()=>read(TICKET_KEY,[]));
  const [inspections,setInspections]=useState<QualityInspection[]>(()=>read(INSPECTION_KEY,[]));
  const [actions,setActions]=useState<CorrectiveAction[]>(()=>read(ACTION_KEY,[]));
  const [slaHours,setSlaHours]=useState<Record<TicketPriority,number>>(()=>read(SLA_KEY,{low:72,normal:48,high:24,urgent:4}));
  const [draft,setDraft]=useState({title:'',client_id:'',mission_id:'',assignee_id:'',priority:'normal' as TicketPriority,description:'',due_at:''});
  const [inspectionMission,setInspectionMission]=useState('');
  const [inspectionComment,setInspectionComment]=useState('');
  const [inspectionScores,setInspectionScores]=useState({safety:100,finish:100,cleanliness:100,documentation:100});
  const [nonconformity,setNonconformity]=useState('');

  const persistTickets=(rows:ServiceTicket[])=>{setTickets(rows);save(TICKET_KEY,rows)};
  const persistInspections=(rows:QualityInspection[])=>{setInspections(rows);save(INSPECTION_KEY,rows)};
  const persistActions=(rows:CorrectiveAction[])=>{setActions(rows);save(ACTION_KEY,rows)};
  const persistSla=(next:Record<TicketPriority,number>)=>{setSlaHours(next);save(SLA_KEY,next)};

  const now=Date.now();
  const activeTickets=useMemo(()=>tickets.filter(t=>!['done','cancelled'].includes(t.status)).sort((a,b)=>priorityWeight(b.priority)-priorityWeight(a.priority)||(new Date(a.due_at??'2999').getTime()-new Date(b.due_at??'2999').getTime())),[tickets]);
  const overdueTickets=useMemo(()=>activeTickets.filter(t=>{const limit=t.due_at?new Date(t.due_at).getTime():new Date(t.created_at).getTime()+slaHours[t.priority]*3600000;return limit<now}),[activeTickets,slaHours,now]);
  const todayMissions=useMemo(()=>missions.filter(m=>m.scheduled_start&&new Date(m.scheduled_start).toDateString()===new Date().toDateString()).sort((a,b)=>new Date(a.scheduled_start!).getTime()-new Date(b.scheduled_start!).getTime()),[missions]);
  const unassignedToday=todayMissions.filter(m=>!m.assigned_user_id);
  const activeTimers=timeEntries.filter(t=>!t.ended_at);
  const criticalStock=inventory.filter(i=>i.quantity<=i.minimum_quantity);
  const openActions=actions.filter(a=>a.status==='open');
  const qualityByMission=useMemo(()=>new Map(inspections.map(i=>[i.mission_id,i])),[inspections]);
  const avgQuality=inspections.length?Math.round(inspections.reduce((s,i)=>s+scoreInspection(i),0)/inspections.length):100;
  const operationalScore=Math.max(0,100-overdueTickets.length*8-unassignedToday.length*6-openActions.filter(a=>a.severity==='critical').length*10-criticalStock.length*2-(avgQuality<80?10:0));

  const createTicket=()=>{
    if(!draft.title.trim())return;
    const created=new Date().toISOString();
    const due=draft.due_at?new Date(draft.due_at).toISOString():new Date(Date.now()+slaHours[draft.priority]*3600000).toISOString();
    const row:ServiceTicket={id:createId(),title:draft.title.trim(),client_id:draft.client_id||null,mission_id:draft.mission_id||null,assignee_id:draft.assignee_id||null,priority:draft.priority,status:draft.assignee_id?'assigned':'new',due_at:due,description:draft.description.trim(),created_at:created,updated_at:created};
    persistTickets([row,...tickets]);
    setDraft({title:'',client_id:'',mission_id:'',assignee_id:'',priority:'normal',description:'',due_at:''});
  };
  const updateTicket=(id:string,patch:Partial<ServiceTicket>)=>persistTickets(tickets.map(t=>t.id===id?{...t,...patch,updated_at:new Date().toISOString()}:t));
  const assignTicket=(id:string,userId:string)=>updateTicket(id,{assignee_id:userId||null,status:userId?'assigned':'new'});
  const createAction=(input:Omit<CorrectiveAction,'id'|'created_at'|'status'>)=>persistActions([{...input,id:createId(),status:'open',created_at:new Date().toISOString()},...actions]);

  const createInspection=()=>{
    if(!inspectionMission)return;
    const issues=nonconformity.trim()?nonconformity.split('\n').map(x=>x.trim()).filter(Boolean):[];
    const row:QualityInspection={id:createId(),mission_id:inspectionMission,inspector:'Contrôle terrain',...inspectionScores,nonconformities:issues,comment:inspectionComment.trim(),created_at:new Date().toISOString()};
    persistInspections([row,...inspections.filter(i=>i.mission_id!==inspectionMission)]);
    const score=scoreInspection(row);
    addMissionNote(inspectionMission,`Contrôle qualité : ${score}/100${issues.length?` · ${issues.length} non-conformité(s)`:''}. ${inspectionComment}`.trim());
    if(score<80||issues.length){createAction({mission_id:inspectionMission,ticket_id:null,title:`Corriger contrôle qualité (${score}/100)`,owner_id:missions.find(m=>m.id===inspectionMission)?.assigned_user_id??null,due_at:new Date(Date.now()+48*3600000).toISOString(),severity:score<60?'critical':'warning'})}
    setInspectionComment('');setNonconformity('');setInspectionScores({safety:100,finish:100,cleanliness:100,documentation:100});
  };

  const autoDispatch=()=>{
    const activeMembers=team.filter(u=>u.active);
    if(!activeMembers.length)return;
    const load=(id:string)=>todayMissions.filter(m=>m.assigned_user_id===id).length+activeTickets.filter(t=>t.assignee_id===id).length;
    let changed=0;
    for(const mission of unassignedToday){const best=[...activeMembers].sort((a,b)=>load(a.id)-load(b.id))[0];if(best){assignMission(mission.id,best.id);changed++}}
    for(const ticket of activeTickets.filter(t=>!t.assignee_id)){const best=[...activeMembers].sort((a,b)=>load(a.id)-load(b.id))[0];if(best){assignTicket(ticket.id,best.id);changed++}}
    if(changed)alert(`${changed} élément(s) affecté(s).`);
  };

  const exportCsv=()=>{
    const rows=[['type','titre','client/mission','responsable','statut','priorité/sévérité','échéance','créé le'],...tickets.map(t=>['ticket',t.title,clients.find(c=>c.id===t.client_id)?.company_name||missions.find(m=>m.id===t.mission_id)?.title||'',team.find(u=>u.id===t.assignee_id)?.name||'',t.status,t.priority,t.due_at||'',t.created_at]),...actions.map(a=>['action',a.title,missions.find(m=>m.id===a.mission_id)?.title||'',team.find(u=>u.id===a.owner_id)?.name||'',a.status,a.severity,a.due_at||'',a.created_at])];
    download(`closerflow-field-ops-${new Date().toISOString().slice(0,10)}.csv`,rows.map(r=>r.map(csvCell).join(';')).join('\n'));
  };

  return <div className="field-ops-page">
    <div className="page-title"><div><p className="eyebrow">V13.8 · TERRAIN & QUALITÉ</p><h1>Field Operations</h1><p>Dispatch, tickets SAV, SLA, contrôles qualité et actions correctives dans un seul cockpit.</p></div><div className="row-actions"><button className="ghost" onClick={exportCsv}><Download/>Exporter</button><Link className="primary-button" to="/terrain"><Wrench/>Mode terrain</Link></div></div>

    <div className="kpi-grid field-kpis">
      <article><span>Score opérationnel</span><strong>{operationalScore}/100</strong><small>{operationalScore>=85?'Sous contrôle':operationalScore>=65?'À surveiller':'Action immédiate'}</small></article>
      <article><span>Interventions aujourd’hui</span><strong>{todayMissions.length}</strong><small>{unassignedToday.length} sans responsable</small></article>
      <article><span>Tickets actifs</span><strong>{activeTickets.length}</strong><small>{overdueTickets.length} hors SLA</small></article>
      <article><span>Qualité moyenne</span><strong>{avgQuality}%</strong><small>{inspections.length} contrôle(s)</small></article>
      <article><span>Actions ouvertes</span><strong>{openActions.length}</strong><small>{openActions.filter(a=>a.severity==='critical').length} critique(s)</small></article>
      <article><span>Chronos actifs</span><strong>{activeTimers.length}</strong><small>{criticalStock.length} article(s) stock critique</small></article>
    </div>

    <div className="field-tabs">
      <button className={tab==='dispatch'?'active':''} onClick={()=>setTab('dispatch')}><MapPinned/>Dispatch</button>
      <button className={tab==='tickets'?'active':''} onClick={()=>setTab('tickets')}><ShieldAlert/>Tickets & SLA</button>
      <button className={tab==='quality'?'active':''} onClick={()=>setTab('quality')}><ClipboardCheck/>Qualité</button>
      <button className={tab==='actions'?'active':''} onClick={()=>setTab('actions')}><Target/>Actions</button>
    </div>

    {tab==='dispatch'&&<div className="field-grid">
      <section className="panel field-wide"><div className="section-heading"><div><h2>Dispatch du jour</h2><p>Charge, affectation et état réel des interventions.</p></div><button className="primary small" onClick={autoDispatch}><Users/>Auto-affecter</button></div>
        <div className="dispatch-list">{todayMissions.map(m=>{const user=team.find(u=>u.id===m.assigned_user_id);const inspection=qualityByMission.get(m.id);return <article key={m.id} className={!m.assigned_user_id?'warning':''}><div className="dispatch-time"><Clock3/><strong>{m.scheduled_start?new Date(m.scheduled_start).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—'}</strong></div><div className="field-main"><strong>{m.title}</strong><small>{m.address||'Adresse non renseignée'} · {user?.name||'Non affecté'}</small></div><span className={`field-status ${m.status}`}>{m.status.replace('_',' ')}</span><div className="quality-mini">{inspection?<><Gauge/><b>{scoreInspection(inspection)}%</b></>:<small>Non contrôlé</small>}</div><select value={m.assigned_user_id??''} onChange={e=>assignMission(m.id,e.target.value||null)}><option value="">Non affecté</option>{team.filter(u=>u.active).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select><Link className="ghost small" to={`/missions/${m.id}`}>Ouvrir <ArrowRight/></Link></article>})}{!todayMissions.length&&<div className="empty-state"><CheckCircle2/><strong>Aucune intervention aujourd’hui</strong><span>Le planning du jour est vide.</span></div>}</div>
      </section>
      <section className="panel"><div className="section-heading"><div><h2>Équipe</h2><p>Charge du jour et activité.</p></div><UserRoundCheck/></div><div className="field-team-list">{team.filter(u=>u.active).map(u=>{const missionsCount=todayMissions.filter(m=>m.assigned_user_id===u.id).length;const ticketCount=activeTickets.filter(t=>t.assignee_id===u.id).length;const timer=activeTimers.find(t=>t.user_id===u.id);return <article key={u.id}><div><strong>{u.name}</strong><small>{u.role} · {missionsCount} mission(s) · {ticketCount} ticket(s)</small></div><span className={timer?'live':'idle'}>{timer?'En intervention':'Disponible'}</span></article>})}</div></section>
      <section className="panel"><div className="section-heading"><div><h2>Signaux terrain</h2><p>Alertes opérationnelles.</p></div><Activity/></div><div className="field-signal-list">{overdueTickets.slice(0,4).map(t=><article className="critical" key={t.id}><AlertTriangle/><div><strong>{t.title}</strong><small>SLA dépassé · {fmtDate(t.due_at)}</small></div></article>)}{siteJournalEntries.filter(e=>e.important).slice(0,4).map(e=><article key={e.id}><ShieldAlert/><div><strong>{e.title}</strong><small>{missions.find(m=>m.id===e.mission_id)?.title||'Chantier'} · {e.category}</small></div></article>)}{!overdueTickets.length&&!siteJournalEntries.some(e=>e.important)&&<div className="empty-state compact"><ShieldCheck/><p>Aucun signal critique.</p></div>}</div></section>
    </div>}

    {tab==='tickets'&&<div className="field-grid">
      <section className="panel field-wide"><div className="section-heading"><div><h2>Tickets intervention / SAV</h2><p>Priorités, responsables, SLA et suivi jusqu’à clôture.</p></div><ShieldAlert/></div>
        <div className="ticket-create form-grid"><label>Titre<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Ex. Fuite après intervention"/></label><label>Client<select value={draft.client_id} onChange={e=>setDraft({...draft,client_id:e.target.value})}><option value="">Aucun</option>{clients.map(c=><option value={c.id} key={c.id}>{c.company_name||`${c.first_name} ${c.last_name}`}</option>)}</select></label><label>Chantier<select value={draft.mission_id} onChange={e=>setDraft({...draft,mission_id:e.target.value})}><option value="">Aucun</option>{missions.map(m=><option value={m.id} key={m.id}>{m.title}</option>)}</select></label><label>Responsable<select value={draft.assignee_id} onChange={e=>setDraft({...draft,assignee_id:e.target.value})}><option value="">À affecter</option>{team.filter(u=>u.active).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label><label>Priorité<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value as TicketPriority})}><option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select></label><label>Échéance<input type="datetime-local" value={draft.due_at} onChange={e=>setDraft({...draft,due_at:e.target.value})}/></label><label className="field-full">Description<textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label></div><button className="primary-button" onClick={createTicket}><Plus/>Créer le ticket</button>
        <div className="ticket-list">{tickets.map(t=>{const limit=t.due_at?new Date(t.due_at).getTime():new Date(t.created_at).getTime()+slaHours[t.priority]*3600000;const overdue=!['done','cancelled'].includes(t.status)&&limit<now;return <article key={t.id} className={`${t.priority} ${overdue?'overdue':''}`}><div className="ticket-priority">{t.priority}</div><div className="field-main"><strong>{t.title}</strong><small>{clients.find(c=>c.id===t.client_id)?.company_name||missions.find(m=>m.id===t.mission_id)?.title||'Sans dossier'} · échéance {fmtDate(t.due_at)}</small><p>{t.description}</p></div><select value={t.assignee_id??''} onChange={e=>assignTicket(t.id,e.target.value)}><option value="">Non affecté</option>{team.filter(u=>u.active).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select><select value={t.status} onChange={e=>updateTicket(t.id,{status:e.target.value as TicketStatus})}><option value="new">Nouveau</option><option value="assigned">Affecté</option><option value="in_progress">En cours</option><option value="waiting">En attente</option><option value="done">Terminé</option><option value="cancelled">Annulé</option></select><button className="ghost small" onClick={()=>createAction({mission_id:t.mission_id,ticket_id:t.id,title:`Action : ${t.title}`,owner_id:t.assignee_id,due_at:t.due_at,severity:t.priority==='urgent'?'critical':t.priority==='high'?'warning':'info'})}>Action</button></article>})}{!tickets.length&&<div className="empty-state"><ShieldCheck/><strong>Aucun ticket</strong><span>Crée un ticket pour suivre une intervention imprévue ou un SAV.</span></div>}</div>
      </section>
      <section className="panel"><div className="section-heading"><div><h2>Paramètres SLA</h2><p>Délai cible automatique par priorité.</p></div><Clock3/></div><div className="sla-grid">{(['urgent','high','normal','low'] as TicketPriority[]).map(p=><label key={p}><span>{p}</span><input type="number" min="1" value={slaHours[p]} onChange={e=>persistSla({...slaHours,[p]:Math.max(1,Number(e.target.value)||1)})}/><small>heures</small></label>)}</div></section>
    </div>}

    {tab==='quality'&&<div className="field-grid">
      <section className="panel"><div className="section-heading"><div><h2>Nouveau contrôle</h2><p>Score standardisé de fin de chantier.</p></div><ClipboardCheck/></div><label>Chantier<select value={inspectionMission} onChange={e=>setInspectionMission(e.target.value)}><option value="">Choisir…</option>{missions.map(m=><option value={m.id} key={m.id}>{m.title}</option>)}</select></label><div className="quality-form">{Object.entries(inspectionScores).map(([key,val])=><label key={key}><span>{key==='safety'?'Sécurité':key==='finish'?'Finitions':key==='cleanliness'?'Propreté':'Documentation'}</span><input type="range" min="0" max="100" step="5" value={val} onChange={e=>setInspectionScores({...inspectionScores,[key]:Number(e.target.value)})}/><b>{val}%</b></label>)}</div><label>Non-conformités<textarea value={nonconformity} onChange={e=>setNonconformity(e.target.value)} placeholder="Une anomalie par ligne"/></label><label>Commentaire<textarea value={inspectionComment} onChange={e=>setInspectionComment(e.target.value)} placeholder="Observations générales"/></label><button className="primary-button" onClick={createInspection}><FileCheck2/>Enregistrer le contrôle</button></section>
      <section className="panel field-wide"><div className="section-heading"><div><h2>Historique qualité</h2><p>Dernier contrôle enregistré par chantier.</p></div><Gauge/></div><div className="quality-list">{inspections.map(i=>{const score=scoreInspection(i);return <article key={i.id} className={score<60?'bad':score<80?'mid':'good'}><div className="quality-score">{score}</div><div className="field-main"><strong>{missions.find(m=>m.id===i.mission_id)?.title||'Mission supprimée'}</strong><small>{fmtDate(i.created_at)} · {i.inspector}</small><p>{i.comment||'Sans commentaire'}</p></div><div className="quality-breakdown"><span>Sécurité <b>{i.safety}</b></span><span>Finitions <b>{i.finish}</b></span><span>Propreté <b>{i.cleanliness}</b></span><span>Docs <b>{i.documentation}</b></span></div><div><strong>{i.nonconformities.length}</strong><small> anomalie(s)</small></div><Link className="ghost small" to={`/missions/${i.mission_id}`}>Chantier</Link></article>})}{!inspections.length&&<div className="empty-state"><ClipboardCheck/><strong>Aucun contrôle qualité</strong><span>Commence par contrôler un chantier.</span></div>}</div></section>
    </div>}

    {tab==='actions'&&<div className="field-grid">
      <section className="panel field-wide"><div className="section-heading"><div><h2>Plan d’actions correctives</h2><p>Écarts qualité, urgences et engagements terrain.</p></div><Target/></div><div className="action-list">{actions.map(a=>{const mission=missions.find(m=>m.id===a.mission_id);return <article key={a.id} className={`${a.severity} ${a.status}`}><button className={`action-check ${a.status}`} onClick={()=>persistActions(actions.map(x=>x.id===a.id?{...x,status:x.status==='done'?'open':'done'}:x))}>{a.status==='done'?<CheckCircle2/>:<Target/>}</button><div className="field-main"><strong>{a.title}</strong><small>{mission?.title||'Action transverse'} · {team.find(u=>u.id===a.owner_id)?.name||'Sans responsable'} · {fmtDate(a.due_at)}</small></div><span className={`severity ${a.severity}`}>{a.severity}</span>{mission&&<Link className="ghost small" to={`/missions/${mission.id}`}>Ouvrir</Link>}</article>})}{!actions.length&&<div className="empty-state"><ShieldCheck/><strong>Aucune action corrective</strong><span>Les contrôles et tickets alimenteront cette liste.</span></div>}</div></section>
      <section className="panel"><div className="section-heading"><div><h2>Indicateurs</h2><p>Qualité et discipline opérationnelle.</p></div><PackageCheck/></div><div className="field-summary"><article><span>SLA respecté</span><strong>{activeTickets.length?Math.round((1-overdueTickets.length/activeTickets.length)*100):100}%</strong></article><article><span>Qualité moyenne</span><strong>{avgQuality}%</strong></article><article><span>Actions critiques</span><strong>{openActions.filter(a=>a.severity==='critical').length}</strong></article><article><span>Chantiers contrôlés</span><strong>{new Set(inspections.map(i=>i.mission_id)).size}/{missions.length}</strong></article></div></section>
    </div>}
  </div>;
}
