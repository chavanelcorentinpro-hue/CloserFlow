import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalendarOff, CheckCircle2, CircleAlert, Download, FileText, ReceiptText, Users, Wrench, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { createId } from '../lib/id';

type Absence={id:string;user_id:string;start:string;end:string;reason:string;created_at:string};
const KEY='closerflow.absences.v13';
const read=():Absence[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
const isoDay=(d:Date)=>d.toISOString().slice(0,10);
const euro=(n:number)=>n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});

export function MilestonesPage(){
 const {clients,missions,quotes,invoices,team,timeEntries,inventory,businessExpenses}=useAppData();
 const [absences,setAbsences]=useState<Absence[]>(read);
 const [tab,setTab]=useState<'pilotage'|'absences'>('pilotage');
 const save=(rows:Absence[])=>{setAbsences(rows);localStorage.setItem(KEY,JSON.stringify(rows))};
 const metrics=useMemo(()=>{
  const quoteTotal=quotes.reduce((s,q)=>s+q.lines.reduce((x,l)=>x+l.quantity*l.unit_price_ht,0)*(1-(q.discount_percent||0)/100),0);
  const invoiceTotal=invoices.reduce((s,i)=>s+i.lines.reduce((x,l)=>x+l.quantity*l.unit_price_ht,0)*(1-(i.discount_percent||0)/100)*(1+i.vat_rate/100),0);
  const paid=invoices.reduce((s,i)=>s+(i.payments||[]).reduce((x,p)=>x+p.amount,0),0);
  const labour=timeEntries.reduce((s,e)=>{const end=e.ended_at?+new Date(e.ended_at):Date.now();return s+Math.max(0,end-+new Date(e.started_at))/3600000*e.hourly_cost},0);
  const expenses=businessExpenses.reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);
  return {quoteTotal,invoiceTotal,paid,labour,expenses,margin:invoiceTotal-labour-expenses};
 },[quotes,invoices,timeEntries,businessExpenses]);
 const conflicts=useMemo(()=>missions.filter(m=>m.assigned_user_id&&m.scheduled_start&&m.scheduled_end).filter((m,i,all)=>all.some((n,j)=>j!==i&&n.assigned_user_id===m.assigned_user_id&&n.scheduled_start&&n.scheduled_end&&+new Date(m.scheduled_start!)<+new Date(n.scheduled_end!)&&+new Date(m.scheduled_end!)>+new Date(n.scheduled_start!))).length,[missions]);
 const missing=useMemo(()=>({clients:clients.filter(c=>!c.phone&&!c.email).length,missions:missions.filter(m=>['accepted','planned','in_progress'].includes(m.status)&&!m.assigned_user_id).length,quotes:quotes.filter(q=>q.status==='draft').length,invoices:invoices.filter(i=>['overdue','partial'].includes(i.status)).length,stock:inventory.filter(i=>i.quantity<=i.minimum_quantity).length}),[clients,missions,quotes,invoices,inventory]);
 function addAbsence(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const row:Absence={id:createId(),user_id:String(f.get('user_id')),start:String(f.get('start')),end:String(f.get('end')),reason:String(f.get('reason')||'Indisponible'),created_at:new Date().toISOString()};save([row,...absences]);e.currentTarget.reset()}
 function exportCsv(){const rows=[['Collaborateur','Début','Fin','Motif'],...absences.map(a=>[team.find(t=>t.id===a.user_id)?.name||'Inconnu',a.start,a.end,a.reason])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download=`absences-${isoDay(new Date())}.csv`;a.click();URL.revokeObjectURL(a.href)}
 const milestone1=[['CRM clients',clients.length>0,'/clients'],['Devis',quotes.length>0,'/quotes'],['Factures',invoices.length>0,'/invoices'],['Chantiers',missions.length>0,'/missions'],['Documents et signatures',true,'/documents'],['Sauvegarde',true,'/backup-center']];
 const milestone2=[['Équipe',team.length>0,'/team'],['Planning',missions.some(m=>m.scheduled_start),'/planning'],['Pointage',timeEntries.length>0,'/time-tracking'],['Rentabilité',true,'/profitability'],['Absences',true,'/milestones'],['Tableau de bord',true,'/']];
 return <><div className="section-heading"><div><p className="eyebrow">CLOSERFLOW 13</p><h1>Jalons 1 & 2</h1><p className="muted-copy">Centre unique de validation, pilotage et gestion des indisponibilités.</p></div><div className="team-actions"><button className={tab==='pilotage'?'primary small':'secondary'} onClick={()=>setTab('pilotage')}>Pilotage</button><button className={tab==='absences'?'primary small':'secondary'} onClick={()=>setTab('absences')}><CalendarOff/>Absences</button></div></div>
 {tab==='pilotage'?<>
 <div className="report-kpis"><article><span>Devis HT</span><strong>{euro(metrics.quoteTotal)}</strong></article><article><span>Facturé TTC</span><strong>{euro(metrics.invoiceTotal)}</strong></article><article><span>Encaissé</span><strong>{euro(metrics.paid)}</strong></article><article><span>Marge opérationnelle</span><strong>{euro(metrics.margin)}</strong></article></div>
 <div className="milestone-grid"><section className="panel"><h2>Jalon 1 · Exploitation</h2>{milestone1.map(([label,ok,to])=><Link className="milestone-row" to={String(to)} key={String(label)}>{ok?<CheckCircle2/>:<CircleAlert/>}<span>{label}</span><strong>{ok?'Opérationnel':'À configurer'}</strong></Link>)}</section><section className="panel"><h2>Jalon 2 · Organisation</h2>{milestone2.map(([label,ok,to])=><Link className="milestone-row" to={String(to)} key={String(label)}>{ok?<CheckCircle2/>:<CircleAlert/>}<span>{label}</span><strong>{ok?'Opérationnel':'À configurer'}</strong></Link>)}</section></div>
 <section className="panel"><h2>Actions prioritaires</h2><div className="action-grid"><Link to="/clients"><Users/><span>Clients sans contact</span><strong>{missing.clients}</strong></Link><Link to="/missions"><Wrench/><span>Chantiers sans responsable</span><strong>{missing.missions}</strong></Link><Link to="/quotes"><FileText/><span>Devis brouillons</span><strong>{missing.quotes}</strong></Link><Link to="/invoices"><ReceiptText/><span>Factures à traiter</span><strong>{missing.invoices}</strong></Link><Link to="/planning"><CircleAlert/><span>Conflits planning</span><strong>{conflicts}</strong></Link><Link to="/inventory"><CircleAlert/><span>Stocks faibles</span><strong>{missing.stock}</strong></Link></div></section>
 </>:<>
 <form className="form-card absence-form" onSubmit={addAbsence}><h2>Ajouter une indisponibilité</h2><label>Collaborateur<select name="user_id" required>{team.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Début<input name="start" type="date" required defaultValue={isoDay(new Date())}/></label><label>Fin<input name="end" type="date" required defaultValue={isoDay(new Date())}/></label><label className="wide">Motif<input name="reason" placeholder="Congé, formation, maladie…"/></label><button className="primary">Enregistrer</button><button type="button" className="secondary" onClick={exportCsv}><Download/>Exporter CSV</button></form>
 <div className="stack">{absences.length===0?<section className="empty-state"><CalendarOff/><h2>Aucune indisponibilité</h2><p>Ajoute les congés et absences pour sécuriser le planning.</p></section>:absences.map(a=><article className="absence-card" key={a.id}><div><strong>{team.find(t=>t.id===a.user_id)?.name||'Collaborateur supprimé'}</strong><small>{a.start} → {a.end}</small><p>{a.reason}</p></div><button className="icon-danger" onClick={()=>save(absences.filter(x=>x.id!==a.id))}><X/></button></article>)}</div>
 </>}</>;
}
