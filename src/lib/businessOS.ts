import type { BusinessExpense, Client, Invoice, MaintenanceContract, Mission, Quote, TeamMember, TimeEntry } from '../types/domain';
export const DAY=86400000;
export const money=(v:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(v)?v:0);
export const dateFr=(v:string|null|undefined)=>v?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';
export const dateTimeFr=(v:string|null|undefined)=>v?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
export const startOfDay=(d=new Date())=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
export const lineTotal=(lines:{quantity:number;unit_price_ht:number}[],discount=0)=>lines.reduce((s,l)=>s+(+l.quantity||0)*(+l.unit_price_ht||0),0)*(1-(+discount||0)/100);
export const quoteTotal=(q:Quote)=>lineTotal(q.lines,q.discount_percent);
export const invoiceHt=(i:Invoice)=>lineTotal(i.lines,i.discount_percent);
export const invoiceTtc=(i:Invoice)=>invoiceHt(i)*(1+(+i.vat_rate||0)/100);
export const paidAmount=(i:Invoice)=>(i.payments||[]).reduce((s,p)=>s+(+p.amount||0),0);
export const remainingAmount=(i:Invoice)=>Math.max(0,invoiceTtc(i)-paidAmount(i));
export const clientLabel=(c:Client|undefined)=>c?(c.company_name||`${c.first_name} ${c.last_name}`.trim()||'Client sans nom'):'Client inconnu';
export const durationHours=(e:TimeEntry,now=Date.now())=>Math.max(0,((e.ended_at?new Date(e.ended_at).getTime():now)-new Date(e.started_at).getTime())/3600000);
export type DataIssue={id:string;level:'critical'|'warning'|'info';area:'client'|'mission'|'quote'|'invoice'|'team';title:string;detail:string;href:string};
export function auditData({clients,missions,quotes,invoices,team}:{clients:Client[];missions:Mission[];quotes:Quote[];invoices:Invoice[];team:TeamMember[]}):DataIssue[]{
 const out:DataIssue[]=[];const invoiceQuoteIds=new Set(invoices.map(i=>i.quote_id).filter(Boolean));
 for(const c of clients){if(!c.phone&&!c.email)out.push({id:`cc-${c.id}`,level:'warning',area:'client',title:'Client injoignable',detail:clientLabel(c),href:'/clients'});if(c.customer_type==='business'&&!c.siren)out.push({id:`cs-${c.id}`,level:'warning',area:'client',title:'SIREN manquant',detail:clientLabel(c),href:'/clients'});}
 for(const m of missions){if(['planned','in_progress'].includes(m.status)&&!m.assigned_user_id)out.push({id:`ma-${m.id}`,level:'critical',area:'mission',title:'Chantier sans responsable',detail:m.title,href:`/missions/${m.id}`});if(m.status==='planned'&&!m.scheduled_start)out.push({id:`md-${m.id}`,level:'critical',area:'mission',title:'Chantier sans date',detail:m.title,href:`/missions/${m.id}`});if(['planned','in_progress'].includes(m.status)&&!m.address)out.push({id:`ml-${m.id}`,level:'warning',area:'mission',title:'Adresse manquante',detail:m.title,href:`/missions/${m.id}`});if(m.status==='completed'&&!m.closeout)out.push({id:`mc-${m.id}`,level:'warning',area:'mission',title:'Clôture incomplète',detail:m.title,href:`/missions/${m.id}/closeout`});}
 for(const q of quotes){if(!q.client_id)out.push({id:`qc-${q.id}`,level:'warning',area:'quote',title:'Devis sans client',detail:`${q.number} — ${q.title}`,href:`/quotes/${q.id}`});if(q.status==='accepted'&&!invoiceQuoteIds.has(q.id))out.push({id:`qu-${q.id}`,level:'critical',area:'quote',title:'Devis accepté non facturé',detail:`${q.number} — ${q.title}`,href:`/quotes/${q.id}`});}
 const now=Date.now();for(const i of invoices){if(i.status!=='paid'&&!i.due_date)out.push({id:`id-${i.id}`,level:'warning',area:'invoice',title:'Facture sans échéance',detail:`${i.number} — ${i.title}`,href:`/invoices/${i.id}`});if(i.status!=='paid'&&i.due_date&&new Date(i.due_date).getTime()<now&&remainingAmount(i)>0)out.push({id:`io-${i.id}`,level:'critical',area:'invoice',title:'Facture échue',detail:`${i.number} · ${money(remainingAmount(i))}`,href:`/invoices/${i.id}`});}
 if(!team.some(t=>t.active))out.push({id:'team-empty',level:'critical',area:'team',title:'Aucun collaborateur actif',detail:'Impossible de dispatcher les chantiers.',href:'/team'});
 return out.sort((a,b)=>({critical:0,warning:1,info:2}[a.level]-{critical:0,warning:1,info:2}[b.level]));
}
export function forecast({invoices,expenses,contracts}:{invoices:Invoice[];expenses:BusinessExpense[];contracts:MaintenanceContract[]}){
 const now=startOfDay();return [30,60,90].map(days=>{const until=now+days*DAY;const inflows=invoices.filter(i=>i.status!=='paid').filter(i=>{const d=i.due_date?new Date(i.due_date).getTime():new Date(i.created_at).getTime()+30*DAY;return d>=now&&d<=until}).reduce((s,i)=>s+remainingAmount(i),0)+contracts.filter(c=>c.active).filter(c=>{const d=new Date(c.next_due_date).getTime();return d>=now&&d<=until}).reduce((s,c)=>s+c.amount_ht*(1+c.vat_rate/100),0);const outflows=expenses.filter(e=>!e.paid&&new Date(e.expense_date).getTime()<=until).reduce((s,e)=>s+e.amount_ht*(1+e.vat_rate/100),0);return{label:`${days} jours`,inflows,outflows,net:inflows-outflows};});
}
