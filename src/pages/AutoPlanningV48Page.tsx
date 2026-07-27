import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, RefreshCw, UsersRound, WandSparkles } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { buildAutomaticSchedule, shiftDelayedTasks, workloadByMember, type PlannerMember, type PlannerTask } from '../lib/autoPlanningV48';

export function AutoPlanningV48Page(){
  const { missions, teamMembers } = useAppData() as any;
  const [delayProject,setDelayProject]=useState('');
  const [delayDays,setDelayDays]=useState(1);
  const [revision,setRevision]=useState(0);

  const members:PlannerMember[] = useMemo(()=>(
    (teamMembers||[]).map((m:any)=>({
      id:m.id,name:m.name||m.display_name||m.email||'Membre',
      hoursPerWeek:Number(m.hours_per_week||35),
      unavailableDates:m.unavailable_dates||[]
    }))
  ),[teamMembers]);

  const tasks:PlannerTask[] = useMemo(()=>(
    (missions||[]).filter((m:any)=>m.status!=='completed'&&m.status!=='cancelled').flatMap((m:any)=>{
      const hours=Math.max(4,Number(m.estimated_hours||0)||Math.max(4,Number(m.price_ht||0)/75));
      const base=[
        {title:'Préparation',share:.15,priority:90},
        {title:'Travaux principaux',share:.65,priority:80},
        {title:'Contrôle et finitions',share:.20,priority:70},
      ];
      return base.map((t,i)=>({
        id:`${m.id}-v48-${i}`,projectId:m.id,projectTitle:m.title,title:t.title,
        estimatedHours:Math.max(1,hours*t.share),priority:t.priority,
        earliestStart:(m.start_date||m.created_at||new Date().toISOString()).slice(0,10),
        deadline:m.end_date?.slice?.(0,10),assigneeId:m.assigned_to||undefined,status:'todo' as const
      }));
    })
  ),[missions]);

  const baseSchedule=useMemo(()=>buildAutomaticSchedule(tasks,members,56),[tasks,members,revision]);
  const [manualSchedule,setManualSchedule]=useState<typeof baseSchedule|null>(null);
  const schedule=manualSchedule||baseSchedule;
  const workload=workloadByMember(schedule);
  const conflicts=schedule.filter(t=>t.conflict);
  const totalHours=schedule.reduce((s,t)=>s+t.plannedHours,0);

  const applyDelay=()=>{
    if(!delayProject)return;
    setManualSchedule(shiftDelayedTasks(schedule,delayProject,Math.max(1,delayDays)));
  };

  return <>
    <div className="page-title">
      <div><p className="eyebrow">CLOSERFLOW 48 · AUTO PLANNING</p><h1>Planning automatique</h1><p>Répartit les tâches, détecte les conflits et recalcule les dates lorsqu’un chantier prend du retard.</p></div>
      <WandSparkles/>
    </div>

    <section className="v48-kpis">
      <article><CalendarDays/><span>Tâches planifiées</span><strong>{schedule.length}</strong></article>
      <article><Clock3/><span>Heures planifiées</span><strong>{Math.round(totalHours)} h</strong></article>
      <article><UsersRound/><span>Membres disponibles</span><strong>{members.length}</strong></article>
      <article className={conflicts.length?'warning':''}><AlertTriangle/><span>Conflits</span><strong>{conflicts.length}</strong></article>
    </section>

    <section className="v48-grid">
      <div className="panel">
        <div className="section-heading"><div><p className="eyebrow">RECALCUL</p><h2>Retard chantier</h2></div><RefreshCw/></div>
        <label>Chantier<select value={delayProject} onChange={e=>setDelayProject(e.target.value)}><option value="">Sélectionner</option>{[...new Map(schedule.map(t=>[t.projectId,t.projectTitle])).entries()].map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
        <label>Retard (jours)<input type="number" min="1" value={delayDays} onChange={e=>setDelayDays(Number(e.target.value))}/></label>
        <div className="action-row"><button className="primary-button" onClick={applyDelay}>Recalculer</button><button className="secondary-button" onClick={()=>{setManualSchedule(null);setRevision(x=>x+1)}}>Réinitialiser</button></div>
      </div>

      <div className="panel">
        <div className="section-heading"><div><p className="eyebrow">CHARGE</p><h2>Charge par personne</h2></div><UsersRound/></div>
        <div className="v48-workload">{members.map(m=>{const w=workload[m.id]||{hours:0,tasks:0,conflicts:0};return <article key={m.id}><div><strong>{m.name}</strong><small>{w.tasks} tâche(s)</small></div><b>{Math.round(w.hours)} h</b><span>{w.conflicts?`${w.conflicts} conflit(s)`:'OK'}</span></article>})}</div>
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">8 SEMAINES</p><h2>Planning calculé</h2></div><CalendarDays/></div>
      <div className="v48-list">{schedule.map(t=><article key={t.id} className={t.conflict?'warning':''}><div><strong>{t.projectTitle} · {t.title}</strong><small>{t.scheduledStart} → {t.scheduledEnd}</small></div><b>{Math.round(t.plannedHours)} h</b><span>{members.find(m=>m.id===t.assigneeId)?.name||'Non affecté'}</span>{t.conflict?<em><AlertTriangle/>{t.conflict}</em>:<em><CheckCircle2/>OK</em>}</article>)}</div>
    </section>
  </>;
}
