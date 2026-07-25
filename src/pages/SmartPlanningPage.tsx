import { addDays, addMinutes, format, isWeekend, setHours, setMinutes, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BrainCircuit, CalendarCheck2, Clock3, Route, Sparkles, UserRoundCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext';

type Suggestion={missionId:string;start:string;end:string;userId:string|null;score:number;reason:string};
const durationFor=(text:string)=>{const t=text.toLowerCase();if(/rénov|salle de bain|chantier complet/.test(t))return 8*60;if(/chauffe.?eau|ballon/.test(t))return 4*60;if(/débouch|fuite|dépannage|urgence/.test(t))return 2*60;if(/devis|visite|diagnostic/.test(t))return 60;return 3*60};
const nextWorkday=(d:Date)=>{let x=d;while(isWeekend(x))x=addDays(x,1);return x};
export function SmartPlanningPage(){
 const {missions,team,assignMission,updateMissionSchedule}=useAppData();
 const [horizon,setHorizon]=useState(14);const [startHour,setStartHour]=useState(8);const [endHour,setEndHour]=useState(17);const [generated,setGenerated]=useState<Suggestion[]>([]);
 const candidates=useMemo(()=>missions.filter(m=>!m.scheduled_start&&m.status!=='archived'&&m.status!=='paid'),[missions]);
 const active=useMemo(()=>team.filter(t=>t.active),[team]);
 const generate=()=>{
  const availability=new Map<string,Date>();const base=nextWorkday(startOfDay(new Date()));
  active.forEach(u=>availability.set(u.id,setMinutes(setHours(base,startHour),0)));
  const ordered=[...candidates].sort((a,b)=>{const au=/urgent|fuite|débouch|panne/i.test(`${a.title} ${a.description??''}`)?1:0;const bu=/urgent|fuite|débouch|panne/i.test(`${b.title} ${b.description??''}`)?1:0;return bu-au||b.price_ht-a.price_ht||a.created_at.localeCompare(b.created_at)});
  const out:Suggestion[]=[];
  for(const mission of ordered){
   const duration=durationFor(`${mission.title} ${mission.description??''}`);let chosen=active[0]?.id??null;let cursor=chosen?availability.get(chosen)!:setMinutes(setHours(base,startHour),0);
   for(const u of active){const d=availability.get(u.id)!;if(d<cursor){cursor=d;chosen=u.id}}
   cursor=nextWorkday(cursor);if(cursor.getHours()>=endHour||cursor.getHours()+duration/60>endHour){cursor=nextWorkday(setMinutes(setHours(addDays(startOfDay(cursor),1),startHour),0))}
   if((cursor.getTime()-base.getTime())/86400000>horizon)break;
   const end=addMinutes(cursor,duration);if(chosen)availability.set(chosen,addMinutes(end,30));
   const urgent=/urgent|fuite|débouch|panne/i.test(`${mission.title} ${mission.description??''}`);
   out.push({missionId:mission.id,start:cursor.toISOString(),end:end.toISOString(),userId:chosen,score:Math.min(99,55+(urgent?25:0)+(mission.price_ht>1000?10:0)+(chosen?8:0)),reason:`${urgent?'Urgence prioritaire · ':''}${duration/60} h estimées${chosen?' · charge équilibrée':''}`});
  }
  setGenerated(out);
 };
 const applyAll=()=>{generated.forEach(s=>{assignMission(s.missionId,s.userId);updateMissionSchedule(s.missionId,s.start,s.end)});setGenerated([])};
 return <><div className="section-heading"><div><p className="eyebrow">V10 · optimisation</p><h1>Planning intelligent</h1><p className="muted-copy">Propose automatiquement les créneaux et l’équipe selon l’urgence, la durée estimée et la charge disponible.</p></div><BrainCircuit/></div>
 <section className="panel smart-planning-controls"><label>Horizon<select value={horizon} onChange={e=>setHorizon(Number(e.target.value))}><option value={7}>7 jours</option><option value={14}>14 jours</option><option value={30}>30 jours</option></select></label><label>Début journée<input type="number" min="6" max="12" value={startHour} onChange={e=>setStartHour(Number(e.target.value))}/></label><label>Fin journée<input type="number" min="14" max="22" value={endHour} onChange={e=>setEndHour(Number(e.target.value))}/></label><button className="primary-button" onClick={generate}><Sparkles/> Générer le planning</button></section>
 <div className="metric-grid"><div className="metric-card"><CalendarCheck2/><strong>{candidates.length}</strong><span>missions à planifier</span></div><div className="metric-card"><UserRoundCheck/><strong>{active.length}</strong><span>membres disponibles</span></div><div className="metric-card"><Route/><strong>{generated.length}</strong><span>propositions générées</span></div></div>
 {generated.length>0&&<><div className="actions-row"><button className="primary-button" onClick={applyAll}>Appliquer toutes les propositions</button><button onClick={()=>setGenerated([])}>Annuler</button></div><div className="smart-plan-list">{generated.map(s=>{const m=missions.find(x=>x.id===s.missionId)!;const u=team.find(x=>x.id===s.userId);return <article className="panel smart-plan-card" key={s.missionId}><div><strong>{m.title}</strong><small>{m.client?.company_name||`${m.client?.first_name??''} ${m.client?.last_name??''}`.trim()||'Sans client'}</small></div><div><CalendarCheck2/><span>{format(new Date(s.start),'EEE d MMM · HH:mm',{locale:fr})}</span></div><div><Clock3/><span>{format(new Date(s.end),'HH:mm')} · {u?.name??'Non affecté'}</span></div><div className="score-pill">{s.score}/100</div><p>{s.reason}</p><button onClick={()=>{assignMission(s.missionId,s.userId);updateMissionSchedule(s.missionId,s.start,s.end);setGenerated(rows=>rows.filter(x=>x.missionId!==s.missionId))}}>Appliquer</button></article>})}</div></>}
 {generated.length===0&&<section className="empty-state"><CalendarCheck2/><h2>Prêt à optimiser</h2><p>Les missions non planifiées seront réparties sans modifier les interventions déjà prévues.</p></section>}</>;
}
