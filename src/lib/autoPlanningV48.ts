export type PlannerMember = {
  id: string;
  name: string;
  hoursPerWeek: number;
  unavailableDates?: string[];
};

export type PlannerTask = {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  estimatedHours: number;
  priority: number;
  earliestStart: string;
  deadline?: string;
  assigneeId?: string;
  status: 'todo'|'doing'|'done';
};

export type ScheduledTask = PlannerTask & {
  scheduledStart: string;
  scheduledEnd: string;
  plannedHours: number;
  conflict?: string;
};

const DAY_HOURS = 7;

const dateKey=(d:Date)=>d.toISOString().slice(0,10);
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const isWorkday=(d:Date)=>d.getDay()!==0&&d.getDay()!==6;

export function buildAutomaticSchedule(tasks:PlannerTask[], members:PlannerMember[], horizonDays=56):ScheduledTask[] {
  const start=new Date(); start.setHours(0,0,0,0);
  const ordered=[...tasks]
    .filter(t=>t.status!=='done')
    .sort((a,b)=>b.priority-a.priority || a.earliestStart.localeCompare(b.earliestStart));

  const availability = new Map<string, Map<string, number>>();
  for(const member of members){
    const days = new Map<string,number>();
    for(let i=0;i<horizonDays;i++){
      const d=addDays(start,i), key=dateKey(d);
      const unavailable=member.unavailableDates?.includes(key);
      const dailyCapacity=Math.min(DAY_HOURS, member.hoursPerWeek/5);
      days.set(key, isWorkday(d)&&!unavailable ? dailyCapacity : 0);
    }
    availability.set(member.id,days);
  }

  const result:ScheduledTask[]=[];
  for(const task of ordered){
    let remaining=Math.max(0.5,task.estimatedHours);
    let first:string|undefined, last:string|undefined;
    let selected=task.assigneeId && availability.has(task.assigneeId) ? task.assigneeId : undefined;

    if(!selected && members.length){
      selected=[...members].sort((a,b)=>{
        const capA=[...(availability.get(a.id)?.values()||[])].reduce((s,v)=>s+v,0);
        const capB=[...(availability.get(b.id)?.values()||[])].reduce((s,v)=>s+v,0);
        return capB-capA;
      })[0].id;
    }

    if(!selected){
      result.push({...task,scheduledStart:task.earliestStart,scheduledEnd:task.earliestStart,plannedHours:0,conflict:'Aucun membre disponible'});
      continue;
    }

    const days=availability.get(selected)!;
    for(let i=0;i<horizonDays&&remaining>0;i++){
      const d=addDays(start,i), key=dateKey(d);
      if(key<task.earliestStart) continue;
      const cap=days.get(key)||0;
      if(cap<=0) continue;
      const used=Math.min(cap,remaining);
      days.set(key,cap-used);
      remaining-=used;
      first??=key; last=key;
    }

    let conflict:string|undefined;
    if(remaining>0) conflict=`${remaining.toFixed(1)} h non planifiées`;
    if(task.deadline && last && last>task.deadline) conflict=`Échéance dépassée (${task.deadline})`;

    result.push({
      ...task,
      assigneeId:selected,
      scheduledStart:first||task.earliestStart,
      scheduledEnd:last||first||task.earliestStart,
      plannedHours:task.estimatedHours-remaining,
      conflict
    });
  }
  return result;
}

export function shiftDelayedTasks(schedule:ScheduledTask[], projectId:string, delayDays:number){
  return schedule.map(task=>{
    if(task.projectId!==projectId || task.status==='done') return task;
    const s=addDays(new Date(task.scheduledStart),delayDays);
    const e=addDays(new Date(task.scheduledEnd),delayDays);
    return {...task,scheduledStart:dateKey(s),scheduledEnd:dateKey(e),conflict:task.deadline&&dateKey(e)>task.deadline?'Échéance dépassée après recalcul':task.conflict};
  });
}

export function workloadByMember(schedule:ScheduledTask[]){
  const map:Record<string,{hours:number;tasks:number;conflicts:number}>={};
  schedule.forEach(t=>{
    const id=t.assigneeId||'unassigned';
    map[id]??={hours:0,tasks:0,conflicts:0};
    map[id].hours+=t.plannedHours;
    map[id].tasks+=1;
    if(t.conflict)map[id].conflicts+=1;
  });
  return map;
}
