import { useMemo, useState } from 'react';
import { addDays, addWeeks, differenceInMinutes, format, isAfter, isBefore, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CalendarRange, Download, Gauge, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const CAPACITY_KEY='closerflow.workload.capacity.v12.2';
const DEFAULT_WEEKLY_HOURS=35;

type CapacityMap=Record<string,number>;

function loadCapacity():CapacityMap{
  try{return JSON.parse(localStorage.getItem(CAPACITY_KEY)??'{}') as CapacityMap;}catch{return {};}
}
function csvCell(value:string|number){return `"${String(value).replaceAll('"','""')}"`;}
function downloadCsv(filename:string, rows:(string|number)[][]){
  const content='\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}

export function WorkloadForecastPage(){
  const {missions,team}=useAppData();
  const [capacity,setCapacity]=useState<CapacityMap>(loadCapacity);
  const [weeks,setWeeks]=useState(6);
  const weekStarts=useMemo(()=>Array.from({length:weeks},(_,index)=>addWeeks(startOfWeek(new Date(),{weekStartsOn:1}),index)),[weeks]);
  const activeTeam=team.filter(member=>member.active);

  const rows=useMemo(()=>activeTeam.map(member=>{
    const weeklyCapacity=Math.max(1,capacity[member.id]??DEFAULT_WEEKLY_HOURS);
    const values=weekStarts.map(weekStart=>{
      const weekEnd=addDays(weekStart,7);
      const assigned=missions.filter(mission=>mission.assigned_user_id===member.id&&mission.scheduled_start&&mission.scheduled_end&&isBefore(new Date(mission.scheduled_start),weekEnd)&&isAfter(new Date(mission.scheduled_end),weekStart));
      const hours=assigned.reduce((total,mission)=>{
        const missionStart=new Date(mission.scheduled_start!);const missionEnd=new Date(mission.scheduled_end!);
        const clippedStart=isAfter(missionStart,weekStart)?missionStart:weekStart;
        const clippedEnd=isBefore(missionEnd,weekEnd)?missionEnd:weekEnd;
        return total+Math.max(0,differenceInMinutes(clippedEnd,clippedStart)/60);
      },0);
      return {weekStart,hours,load:hours/weeklyCapacity,missions:assigned};
    });
    const totalHours=values.reduce((sum,value)=>sum+value.hours,0);
    const overloads=values.filter(value=>value.load>1).length;
    return {member,weeklyCapacity,values,totalHours,overloads};
  }),[activeTeam,capacity,missions,weekStarts]);

  const unscheduled=missions.filter(mission=>['accepted','planned','in_progress'].includes(mission.status)&&(!mission.scheduled_start||!mission.scheduled_end));
  const unassigned=missions.filter(mission=>mission.scheduled_start&&!mission.assigned_user_id&&['accepted','planned','in_progress'].includes(mission.status));
  const overloadCount=rows.reduce((sum,row)=>sum+row.overloads,0);
  const averageLoad=rows.length&&weeks?rows.reduce((sum,row)=>sum+row.values.reduce((inner,value)=>inner+value.load,0),0)/(rows.length*weeks):0;

  function updateCapacity(memberId:string,value:number){
    const next={...capacity,[memberId]:Math.max(1,Math.min(80,value||DEFAULT_WEEKLY_HOURS))};
    setCapacity(next);localStorage.setItem(CAPACITY_KEY,JSON.stringify(next));
  }
  function exportForecast(){
    const header=['Collaborateur','Capacité hebdo',...weekStarts.map(date=>`Semaine du ${format(date,'dd/MM/yyyy')}`),'Total heures','Semaines surchargées'];
    const body=rows.map(row=>[row.member.name,row.weeklyCapacity,...row.values.map(value=>value.hours.toFixed(2)),row.totalHours.toFixed(2),row.overloads]);
    downloadCsv(`charge-equipe-${format(new Date(),'yyyy-MM-dd')}.csv`,[header,...body]);
  }

  return <div className="workload-page">
    <div className="page-title workload-heading"><div><p className="eyebrow">PILOTAGE ÉQUIPE — V12.2</p><h1>Prévision de charge</h1><p>Anticipez les semaines surchargées et les missions sans ressource.</p></div><CalendarRange/></div>
    <section className="workload-kpis">
      <article><Gauge/><div><strong>{Math.round(averageLoad*100)} %</strong><span>Charge moyenne</span></div></article>
      <article className={overloadCount?'danger':''}><AlertTriangle/><div><strong>{overloadCount}</strong><span>Semaines en surcharge</span></div></article>
      <article><UsersRound/><div><strong>{unassigned.length}</strong><span>Missions sans responsable</span></div></article>
      <article><CalendarRange/><div><strong>{unscheduled.length}</strong><span>Missions à planifier</span></div></article>
    </section>

    <section className="card workload-controls">
      <label>Horizon<select value={weeks} onChange={event=>setWeeks(Number(event.target.value))}><option value={4}>4 semaines</option><option value={6}>6 semaines</option><option value={8}>8 semaines</option><option value={12}>12 semaines</option></select></label>
      <button className="secondary-button" onClick={exportForecast}><Download/>Exporter CSV</button>
    </section>

    <section className="card workload-table-card">
      <div className="workload-table-wrap"><table className="workload-table"><thead><tr><th>Collaborateur</th><th>Capacité</th>{weekStarts.map(date=><th key={date.toISOString()}>{format(date,"dd MMM",{locale:fr})}</th>)}<th>Total</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.member.id}><td><strong>{row.member.name}</strong><small>{row.member.role}</small></td><td><input aria-label={`Capacité de ${row.member.name}`} type="number" min="1" max="80" value={row.weeklyCapacity} onChange={event=>updateCapacity(row.member.id,Number(event.target.value))}/><span>h</span></td>{row.values.map(value=>{const percent=Math.round(value.load*100);const className=value.load>1?'overload':value.load>=.8?'warning':value.load>0?'loaded':'empty';return <td key={value.weekStart.toISOString()}><div className={`workload-cell ${className}`} title={value.missions.map(m=>m.title).join(', ')}><strong>{value.hours.toFixed(1)} h</strong><span>{percent} %</span></div></td>})}<td><strong>{row.totalHours.toFixed(1)} h</strong></td></tr>)}
      {!rows.length&&<tr><td colSpan={weeks+3}><div className="empty-state">Ajoutez des collaborateurs actifs pour calculer la charge.</div></td></tr>}
      </tbody></table></div>
    </section>

    <div className="workload-bottom-grid">
      <section className="card"><h2>Missions sans responsable</h2><div className="workload-list">{unassigned.slice(0,8).map(mission=><Link to={`/missions/${mission.id}`} key={mission.id}><div><strong>{mission.title}</strong><small>{mission.scheduled_start?format(new Date(mission.scheduled_start),'dd/MM/yyyy HH:mm'):'Date inconnue'}</small></div><span>Affecter</span></Link>)}{!unassigned.length&&<p className="muted">Toutes les missions planifiées ont un responsable.</p>}</div></section>
      <section className="card"><h2>À planifier</h2><div className="workload-list">{unscheduled.slice(0,8).map(mission=><Link to={`/missions/${mission.id}`} key={mission.id}><div><strong>{mission.title}</strong><small>{mission.status}</small></div><span>Planifier</span></Link>)}{!unscheduled.length&&<p className="muted">Aucune mission en attente de planification.</p>}</div></section>
    </div>
  </div>;
}
