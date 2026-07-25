import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

type ViewMode='day'|'week'|'month';
const dayKey=(date:Date)=>format(date,'yyyy-MM-dd');
const atLocal=(date:Date,hours:number,minutes:number)=>{const d=new Date(date);d.setHours(hours,minutes,0,0);return d};

export function PlanningPage(){
 const {missions,team,updateMissionSchedule}=useAppData();
 const [mode,setMode]=useState<ViewMode>('week');
 const [cursor,setCursor]=useState(new Date());
 const [memberFilter,setMemberFilter]=useState('all');
 const planned=useMemo(()=>missions.filter(m=>m.scheduled_start&&(memberFilter==='all'||m.assigned_user_id===memberFilter)).sort((a,b)=>+new Date(a.scheduled_start!)-+new Date(b.scheduled_start!)),[missions,memberFilter]);
 const days=useMemo(()=>{
  if(mode==='day')return [cursor];
  if(mode==='week'){const start=startOfWeek(cursor,{weekStartsOn:1});return Array.from({length:7},(_,i)=>addDays(start,i));}
  const start=startOfWeek(startOfMonth(cursor),{weekStartsOn:1});const end=endOfWeek(endOfMonth(cursor),{weekStartsOn:1});const out:Date[]=[];for(let d=start;d<=end;d=addDays(d,1))out.push(d);return out;
 },[cursor,mode]);
 const title=mode==='day'?format(cursor,'EEEE d MMMM yyyy',{locale:fr}):mode==='week'?`${format(days[0],'d MMM',{locale:fr})} – ${format(days[6],'d MMM yyyy',{locale:fr})}`:format(cursor,'MMMM yyyy',{locale:fr});
 const move=(dir:-1|1)=>setCursor(current=>mode==='month'?(dir<0?subMonths(current,1):addMonths(current,1)):addDays(current,dir*(mode==='week'?7:1)));
 const drop=(event:DragEvent,day:Date)=>{event.preventDefault();const id=event.dataTransfer.getData('text/mission-id');const mission=missions.find(m=>m.id===id);if(!mission)return;const oldStart=new Date(mission.scheduled_start!);const duration=mission.scheduled_end?Math.max(30*60000,+new Date(mission.scheduled_end)-+oldStart):60*60000;const next=atLocal(day,oldStart.getHours(),oldStart.getMinutes());updateMissionSchedule(id,next.toISOString(),new Date(+next+duration).toISOString())};
 return <>
  <div className="section-heading planning-heading"><div><p className="eyebrow">Organisation</p><h1>Planning</h1><p className="muted-copy planning-period">{title}</p></div><CalendarDays/></div>
  <div className="calendar-filter"><label>Équipe<select value={memberFilter} onChange={e=>setMemberFilter(e.target.value)}><option value="all">Toute l’équipe</option>{team.filter(m=>m.active).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div><div className="calendar-toolbar"><div className="segmented">{(['day','week','month'] as ViewMode[]).map(v=><button key={v} className={mode===v?'active':''} onClick={()=>setMode(v)}>{v==='day'?'Jour':v==='week'?'Semaine':'Mois'}</button>)}</div><div className="calendar-nav"><button onClick={()=>move(-1)} aria-label="Précédent"><ChevronLeft/></button><button onClick={()=>setCursor(new Date())}>Aujourd’hui</button><button onClick={()=>move(1)} aria-label="Suivant"><ChevronRight/></button></div></div>
  <div className={`calendar-grid calendar-${mode}`}>
   {days.map(day=>{const items=planned.filter(m=>isSameDay(new Date(m.scheduled_start!),day));return <section key={dayKey(day)} className={`calendar-day ${!isSameMonth(day,cursor)&&mode==='month'?'outside':''} ${isSameDay(day,new Date())?'today':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,day)}>
    <header><span>{format(day,mode==='month'?'EEE':'EEEE',{locale:fr})}</span><strong>{format(day,'d')}</strong></header>
    <div className="calendar-items">{items.map(m=><article draggable style={{borderLeftColor:team.find(u=>u.id===m.assigned_user_id)?.color||'#bfdbfe',borderLeftWidth:4}} onDragStart={e=>{e.dataTransfer.setData('text/mission-id',m.id);e.dataTransfer.effectAllowed='move'}} className="calendar-event" key={m.id}>
      <Link to={`/missions/${m.id}`}><span className="event-time"><Clock3/>{format(new Date(m.scheduled_start!),'HH:mm')}</span><strong>{m.title}</strong><small>{team.find(u=>u.id===m.assigned_user_id)?.name||'Non affectée'}</small><small>{m.client?.company_name||[m.client?.first_name,m.client?.last_name].filter(Boolean).join(' ')||'Sans client'}</small>{m.address&&<small><MapPin/>{m.address}</small>}</Link>
    </article>)}</div>
   </section>})}
  </div>
  <p className="drag-help">Maintenez une mission puis déposez-la sur un autre jour pour la replanifier.</p>
 </>
}
