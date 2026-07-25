import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, BellRing, Bot, CheckCircle2, Clock3, Download,
  FileCheck2, HandCoins, ListChecks, MessageSquareText, PackageSearch, PlugZap,
  ReceiptText, RefreshCcw, Settings, ShieldCheck, Sparkles, Trash2
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

type RuleTrigger = 'invoice_overdue'|'quote_accepted'|'mission_completed'|'stock_low'|'maintenance_due'|'client_incomplete';
type RuleAction = 'create_followup'|'convert_quote'|'portal_message'|'create_task'|'generate_visit';
type Severity = 'info'|'warning'|'critical';
type QueueStatus = 'open'|'done'|'ignored';

interface LocalRule {
  id:string;
  name:string;
  trigger:RuleTrigger;
  action:RuleAction;
  active:boolean;
  cooldown_hours:number;
  created_at:string;
}
interface QueueItem {
  id:string;
  source_key:string;
  rule_id:string|null;
  trigger:RuleTrigger;
  action:RuleAction;
  severity:Severity;
  title:string;
  detail:string;
  entity_type:'invoice'|'quote'|'mission'|'inventory'|'contract'|'client'|'system';
  entity_id:string|null;
  client_id:string|null;
  amount?:number;
  status:QueueStatus;
  created_at:string;
  completed_at:string|null;
}
interface AutomationLog {
  id:string;
  level:'success'|'warning'|'error'|'info';
  action:string;
  detail:string;
  created_at:string;
}
interface HubSettings {
  autoRun:boolean;
  overdueGraceDays:number;
  stockBuffer:number;
  acceptedQuoteDueDays:number;
  maintenanceHorizonDays:number;
}

const KEYS={rules:'closerflow.automationHub.rules.v13_9',queue:'closerflow.automationHub.queue.v13_9',logs:'closerflow.automationHub.logs.v13_9',settings:'closerflow.automationHub.settings.v13_9'};
const now=()=>new Date().toISOString();
const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
function load<T>(key:string,fallback:T):T{try{const v=localStorage.getItem(key);return v?JSON.parse(v) as T:fallback}catch{return fallback}}
function save<T>(key:string,value:T){localStorage.setItem(key,JSON.stringify(value))}
const money=(n:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number.isFinite(n)?n:0);
const dayMs=86400000;
const invoiceHt=(invoice:{lines:{quantity:number;unit_price_ht:number}[];discount_percent:number})=>{
  const raw=invoice.lines.reduce((s,l)=>s+(Number(l.quantity)||0)*(Number(l.unit_price_ht)||0),0);
  return raw*(1-(Number(invoice.discount_percent)||0)/100);
};
const paidTotal=(invoice:{payments:{amount:number}[]})=>invoice.payments.reduce((s,p)=>s+(Number(p.amount)||0),0);
const clientName=(c:{first_name:string;last_name:string;company_name:string|null}|undefined)=>c?(c.company_name||`${c.first_name} ${c.last_name}`.trim()||'Client'):'Client';

const defaultRules:LocalRule[]=[
  {id:'r-overdue',name:'Relancer les factures échues',trigger:'invoice_overdue',action:'portal_message',active:true,cooldown_hours:72,created_at:now()},
  {id:'r-quote',name:'Préparer la facturation des devis acceptés',trigger:'quote_accepted',action:'create_followup',active:true,cooldown_hours:24,created_at:now()},
  {id:'r-completed',name:'Contrôler les chantiers terminés',trigger:'mission_completed',action:'create_task',active:true,cooldown_hours:24,created_at:now()},
  {id:'r-stock',name:'Alerter sur le stock critique',trigger:'stock_low',action:'create_task',active:true,cooldown_hours:24,created_at:now()},
  {id:'r-maintenance',name:'Préparer les visites d’entretien',trigger:'maintenance_due',action:'generate_visit',active:true,cooldown_hours:24,created_at:now()},
  {id:'r-client',name:'Compléter les fiches clients',trigger:'client_incomplete',action:'create_task',active:false,cooldown_hours:168,created_at:now()},
];
const defaultSettings:HubSettings={autoRun:false,overdueGraceDays:0,stockBuffer:0,acceptedQuoteDueDays:14,maintenanceHorizonDays:30};

export function AutomationHubPage(){
  const data=useAppData();
  const [rules,setRules]=useState<LocalRule[]>(()=>load(KEYS.rules,defaultRules));
  const [queue,setQueue]=useState<QueueItem[]>(()=>load(KEYS.queue,[]));
  const [logs,setLogs]=useState<AutomationLog[]>(()=>load(KEYS.logs,[]));
  const [settings,setSettings]=useState<HubSettings>(()=>load(KEYS.settings,defaultSettings));
  const [tab,setTab]=useState<'command'|'rules'|'queue'|'quality'|'history'>('command');
  const [lastScan,setLastScan]=useState<string|null>(null);

  useEffect(()=>save(KEYS.rules,rules),[rules]);
  useEffect(()=>save(KEYS.queue,queue),[queue]);
  useEffect(()=>save(KEYS.logs,logs),[logs]);
  useEffect(()=>save(KEYS.settings,settings),[settings]);

  const clientsById=useMemo(()=>new Map(data.clients.map(c=>[c.id,c])),[data.clients]);
  const quoteInvoiceIds=useMemo(()=>new Set(data.invoices.map(i=>i.quote_id).filter(Boolean)),[data.invoices]);

  const metrics=useMemo(()=>{
    const ts=Date.now();
    const overdue=data.invoices.filter(i=>i.status!=='paid'&&i.due_date&&new Date(i.due_date).getTime()+settings.overdueGraceDays*dayMs<ts);
    const overdueAmount=overdue.reduce((s,i)=>s+Math.max(0,invoiceHt(i)-paidTotal(i)),0);
    const accepted=data.quotes.filter(q=>q.status==='accepted'&&!quoteInvoiceIds.has(q.id));
    const completed=data.missions.filter(m=>m.status==='completed'&&!data.invoices.some(i=>i.mission_id===m.id));
    const lowStock=data.inventory.filter(i=>i.quantity<=i.minimum_quantity+settings.stockBuffer);
    const maintenance=data.maintenanceContracts.filter(c=>c.active&&new Date(c.next_due_date).getTime()<=ts+settings.maintenanceHorizonDays*dayMs);
    const incomplete=data.clients.filter(c=>!c.phone||!c.email||!c.address||(c.customer_type==='business'&&(!c.siren||!c.vat_number)));
    const open=queue.filter(q=>q.status==='open');
    return {overdue,overdueAmount,accepted,completed,lowStock,maintenance,incomplete,open,critical:open.filter(q=>q.severity==='critical').length};
  },[data.invoices,data.quotes,data.missions,data.inventory,data.maintenanceContracts,data.clients,queue,settings,quoteInvoiceIds]);

  const healthScore=useMemo(()=>{
    let score=100;
    score-=Math.min(30,metrics.overdue.length*6);
    score-=Math.min(18,metrics.accepted.length*4);
    score-=Math.min(16,metrics.completed.length*4);
    score-=Math.min(14,metrics.lowStock.length*2);
    score-=Math.min(12,metrics.incomplete.length*2);
    score-=Math.min(10,metrics.critical*3);
    return Math.max(0,score);
  },[metrics]);

  const addLog=(level:AutomationLog['level'],action:string,detail:string)=>setLogs(rows=>[{id:uid(),level,action,detail,created_at:now()},...rows].slice(0,300));

  const buildCandidates=():QueueItem[]=>{
    const ts=Date.now();
    const items:QueueItem[]=[];
    const rule=(trigger:RuleTrigger)=>rules.find(r=>r.trigger===trigger&&r.active);
    const push=(partial:Omit<QueueItem,'id'|'status'|'created_at'|'completed_at'>)=>items.push({...partial,id:uid(),status:'open',created_at:now(),completed_at:null});

    const overdueRule=rule('invoice_overdue');
    if(overdueRule){for(const invoice of metrics.overdue){
      const remaining=Math.max(0,invoiceHt(invoice)-paidTotal(invoice));
      const days=invoice.due_date?Math.max(1,Math.floor((ts-new Date(invoice.due_date).getTime())/dayMs)):0;
      push({source_key:`overdue:${invoice.id}`,rule_id:overdueRule.id,trigger:'invoice_overdue',action:overdueRule.action,severity:days>45?'critical':days>15?'warning':'info',title:`Relancer ${invoice.number}`,detail:`${money(remaining)} restant · échéance dépassée de ${days} j`,entity_type:'invoice',entity_id:invoice.id,client_id:invoice.client_id,amount:remaining});
    }}
    const quoteRule=rule('quote_accepted');
    if(quoteRule){for(const q of metrics.accepted){
      push({source_key:`quote:${q.id}`,rule_id:quoteRule.id,trigger:'quote_accepted',action:quoteRule.action,severity:'warning',title:`Facturer ${q.number}`,detail:`Devis accepté · ${clientName(q.client_id?clientsById.get(q.client_id):undefined)}`,entity_type:'quote',entity_id:q.id,client_id:q.client_id,amount:q.lines.reduce((s,l)=>s+l.quantity*l.unit_price_ht,0)});
    }}
    const completedRule=rule('mission_completed');
    if(completedRule){for(const m of metrics.completed){
      push({source_key:`mission:${m.id}`,rule_id:completedRule.id,trigger:'mission_completed',action:completedRule.action,severity:'warning',title:`Clôturer / facturer ${m.title}`,detail:'Chantier terminé sans facture associée',entity_type:'mission',entity_id:m.id,client_id:m.client_id});
    }}
    const stockRule=rule('stock_low');
    if(stockRule){for(const i of metrics.lowStock){
      push({source_key:`stock:${i.id}`,rule_id:stockRule.id,trigger:'stock_low',action:stockRule.action,severity:i.quantity<=0?'critical':'warning',title:`Réapprovisionner ${i.name}`,detail:`${i.quantity} ${i.unit} en stock · seuil ${i.minimum_quantity+settings.stockBuffer}`,entity_type:'inventory',entity_id:i.id,client_id:null});
    }}
    const maintenanceRule=rule('maintenance_due');
    if(maintenanceRule){for(const c of metrics.maintenance){
      push({source_key:`maintenance:${c.id}:${c.next_due_date}`,rule_id:maintenanceRule.id,trigger:'maintenance_due',action:maintenanceRule.action,severity:new Date(c.next_due_date).getTime()<ts?'warning':'info',title:`Planifier ${c.title}`,detail:`Échéance ${new Date(c.next_due_date).toLocaleDateString('fr-FR')}`,entity_type:'contract',entity_id:c.id,client_id:c.client_id,amount:c.amount_ht});
    }}
    const clientRule=rule('client_incomplete');
    if(clientRule){for(const c of metrics.incomplete){
      const missing=[!c.phone&&'téléphone',!c.email&&'e-mail',!c.address&&'adresse',c.customer_type==='business'&&!c.siren&&'SIREN',c.customer_type==='business'&&!c.vat_number&&'TVA'].filter(Boolean).join(', ');
      push({source_key:`client:${c.id}`,rule_id:clientRule.id,trigger:'client_incomplete',action:clientRule.action,severity:'info',title:`Compléter ${clientName(c)}`,detail:`Données manquantes : ${missing}`,entity_type:'client',entity_id:c.id,client_id:c.id});
    }}
    return items;
  };

  const scan=()=>{
    const candidates=buildCandidates();
    const existing=new Map(queue.map(q=>[q.source_key,q]));
    let added=0;
    setQueue(rows=>{
      const next=[...rows];
      for(const item of candidates){
        const old=existing.get(item.source_key);
        if(!old||old.status==='ignored'){
          next.unshift(item);added++;
        }else if(old.status==='open'){
          const idx=next.findIndex(q=>q.id===old.id);
          if(idx>=0) next[idx]={...old,title:item.title,detail:item.detail,severity:item.severity,amount:item.amount};
        }
      }
      return next.slice(0,500);
    });
    setLastScan(now());
    addLog('info','Analyse automatique',`${candidates.length} signal(s) détecté(s), ${added} nouvelle(s) action(s).`);
  };

  useEffect(()=>{if(settings.autoRun&&!lastScan){const t=setTimeout(scan,600);return()=>clearTimeout(t)}},[]); // eslint-disable-line react-hooks/exhaustive-deps

  const execute=(item:QueueItem)=>{
    try{
      let detail='Action enregistrée comme traitée.';
      if(item.action==='portal_message'&&item.client_id){
        const inv=data.invoices.find(i=>i.id===item.entity_id);
        const amount=inv?Math.max(0,invoiceHt(inv)-paidTotal(inv)):item.amount||0;
        data.addPortalMessage(item.client_id,'company',`Bonjour, sauf erreur de notre part, la facture ${inv?.number||''} présente un solde de ${money(amount)} arrivé à échéance. Merci de nous indiquer la date prévue de règlement.`);
        detail='Message de relance ajouté au portail client.';
      }else if(item.action==='convert_quote'&&item.entity_id){
        const due=new Date(Date.now()+settings.acceptedQuoteDueDays*dayMs).toISOString();
        const inv=data.convertQuoteToInvoice(item.entity_id,due);
        detail=`Facture ${inv.number} créée avec échéance à ${settings.acceptedQuoteDueDays} jours.`;
      }else if(item.action==='generate_visit'){
        const n=data.generateDueMaintenanceVisits(settings.maintenanceHorizonDays);
        detail=`${n} visite(s) d'entretien créée(s).`;
      }else if(item.action==='create_followup'){
        detail='Action commerciale ajoutée à la file de suivi.';
      }else if(item.action==='create_task'){
        if(item.entity_type==='mission'&&item.entity_id){data.addMissionTask(item.entity_id,'Action automatique : vérifier clôture et facturation');detail='Tâche ajoutée au chantier.'}
        else detail='Action de contrôle validée dans la file.';
      }
      setQueue(rows=>rows.map(q=>q.id===item.id?{...q,status:'done',completed_at:now()}:q));
      addLog('success',item.title,detail);
    }catch(e){addLog('error',item.title,e instanceof Error?e.message:'Échec de l’action');}
  };

  const ignore=(id:string)=>setQueue(rows=>rows.map(q=>q.id===id?{...q,status:'ignored',completed_at:now()}:q));
  const reopen=(id:string)=>setQueue(rows=>rows.map(q=>q.id===id?{...q,status:'open',completed_at:null}:q));
  const clearDone=()=>setQueue(rows=>rows.filter(q=>q.status==='open'));
  const toggleRule=(id:string)=>setRules(rows=>rows.map(r=>r.id===id?{...r,active:!r.active}:r));
  const patchRule=(id:string,patch:Partial<LocalRule>)=>setRules(rows=>rows.map(r=>r.id===id?{...r,...patch}:r));

  const qualityChecks=useMemo(()=>[
    {label:'Clients sans e-mail',count:data.clients.filter(c=>!c.email).length,href:'/clients',level:'warning' as Severity},
    {label:'Clients sans téléphone',count:data.clients.filter(c=>!c.phone).length,href:'/clients',level:'warning' as Severity},
    {label:'B2B sans SIREN',count:data.clients.filter(c=>c.customer_type==='business'&&!c.siren).length,href:'/clients',level:'critical' as Severity},
    {label:'B2B sans TVA',count:data.clients.filter(c=>c.customer_type==='business'&&!c.vat_number).length,href:'/clients',level:'critical' as Severity},
    {label:'Missions sans adresse',count:data.missions.filter(m=>!m.address).length,href:'/missions',level:'warning' as Severity},
    {label:'Missions sans responsable',count:data.missions.filter(m=>!m.assigned_user_id&&!['paid','archived'].includes(m.status)).length,href:'/planning',level:'warning' as Severity},
    {label:'Factures sans échéance',count:data.invoices.filter(i=>i.status!=='paid'&&!i.due_date).length,href:'/invoices',level:'critical' as Severity},
    {label:'Stock sans SKU',count:data.inventory.filter(i=>!i.sku).length,href:'/inventory',level:'info' as Severity},
  ],[data.clients,data.missions,data.invoices,data.inventory]);
  const qualityIssues=qualityChecks.reduce((s,c)=>s+c.count,0);

  const exportCsv=()=>{
    const esc=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;
    const rows=[['statut','gravite','declencheur','action','titre','detail','montant','cree_le'],...queue.map(q=>[q.status,q.severity,q.trigger,q.action,q.title,q.detail,q.amount??'',q.created_at])];
    const blob=new Blob(['\ufeff'+rows.map(r=>r.map(esc).join(';')).join('\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`closerflow-automation-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  };

  const openQueue=queue.filter(q=>q.status==='open').sort((a,b)=>({critical:0,warning:1,info:2}[a.severity]-{critical:0,warning:1,info:2}[b.severity]));
  const triggerLabels:Record<RuleTrigger,string>={invoice_overdue:'Facture échue',quote_accepted:'Devis accepté',mission_completed:'Chantier terminé',stock_low:'Stock bas',maintenance_due:'Entretien à prévoir',client_incomplete:'Fiche client incomplète'};
  const actionLabels:Record<RuleAction,string>={create_followup:'Créer une relance',convert_quote:'Créer la facture',portal_message:'Message portail client',create_task:'Créer une tâche',generate_visit:'Générer une visite'};

  return <div className="automation-hub-page">
    <div className="page-title"><div><p className="eyebrow">AUTOMATION HUB · v13.9</p><h1>Pilote automatique</h1><p>Détecte les risques, prépare les actions et exécute les tâches répétitives sans envoyer tes données à un service IA externe.</p></div><div className="row-actions"><button className="ghost" onClick={exportCsv}><Download size={17}/> CSV</button><button onClick={scan}><RefreshCcw size={17}/> Analyser maintenant</button></div></div>

    <div className="automation-kpis kpi-grid">
      <article><PlugZap/><span>Automatisations</span><strong>{rules.filter(r=>r.active).length}/{rules.length}</strong><small>règles actives</small></article>
      <article className={metrics.critical?'danger':''}><BellRing/><span>À traiter</span><strong>{metrics.open.length}</strong><small>{metrics.critical} critique(s)</small></article>
      <article className={metrics.overdueAmount>0?'warning':''}><HandCoins/><span>Impayés</span><strong>{money(metrics.overdueAmount)}</strong><small>{metrics.overdue.length} facture(s)</small></article>
      <article><FileCheck2/><span>À facturer</span><strong>{metrics.accepted.length+metrics.completed.length}</strong><small>devis/chantiers</small></article>
      <article className={metrics.lowStock.length?'warning':''}><PackageSearch/><span>Stock</span><strong>{metrics.lowStock.length}</strong><small>sous seuil</small></article>
      <article className={qualityIssues?'warning':''}><ShieldCheck/><span>Qualité data</span><strong>{healthScore}/100</strong><small>{qualityIssues} anomalie(s)</small></article>
    </div>

    <div className="automation-tabs">
      <button className={tab==='command'?'active':''} onClick={()=>setTab('command')}><Sparkles/> Aujourd’hui</button>
      <button className={tab==='rules'?'active':''} onClick={()=>setTab('rules')}><Settings/> Règles</button>
      <button className={tab==='queue'?'active':''} onClick={()=>setTab('queue')}><ListChecks/> File d’actions</button>
      <button className={tab==='quality'?'active':''} onClick={()=>setTab('quality')}><ShieldCheck/> Qualité</button>
      <button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><Activity/> Historique</button>
    </div>

    {tab==='command'&&<div className="automation-grid">
      <section className="panel automation-wide"><div className="section-head"><div><h2>Plan d’action prioritaire</h2><p>{lastScan?`Dernière analyse ${new Date(lastScan).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`:'Lance une analyse pour actualiser la file.'}</p></div><span className={`score-pill ${healthScore<60?'bad':healthScore<80?'mid':'good'}`}>Santé {healthScore}/100</span></div>
        <div className="automation-action-list">{openQueue.slice(0,12).map(item=><article key={item.id} className={item.severity}>
          <div className="auto-icon">{item.severity==='critical'?<AlertTriangle/>:item.trigger==='invoice_overdue'?<ReceiptText/>:item.trigger==='stock_low'?<PackageSearch/>:<Bot/>}</div>
          <div className="auto-main"><strong>{item.title}</strong><small>{item.detail}</small>{item.amount!==undefined&&<b>{money(item.amount)}</b>}</div>
          <span className={`severity ${item.severity}`}>{item.severity}</span>
          <div className="row-actions"><button onClick={()=>execute(item)}><CheckCircle2 size={16}/> Exécuter</button><button className="ghost" onClick={()=>ignore(item.id)}>Ignorer</button></div>
        </article>)}{openQueue.length===0&&<div className="empty-state"><CheckCircle2/><strong>Rien de prioritaire</strong><p>Analyse les données pour générer le plan d’action.</p></div>}</div>
      </section>
      <aside className="panel"><h2>Signaux métier</h2><div className="automation-signal-list">
        <Link to="/invoices"><ReceiptText/><div><strong>{metrics.overdue.length} impayé(s)</strong><small>{money(metrics.overdueAmount)} à encaisser</small></div></Link>
        <Link to="/quotes"><FileCheck2/><div><strong>{metrics.accepted.length} devis accepté(s)</strong><small>sans facture liée</small></div></Link>
        <Link to="/missions"><ListChecks/><div><strong>{metrics.completed.length} chantier(s)</strong><small>terminé(s) non facturé(s)</small></div></Link>
        <Link to="/inventory"><PackageSearch/><div><strong>{metrics.lowStock.length} article(s)</strong><small>sous le seuil de sécurité</small></div></Link>
        <Link to="/sav-maintenance"><Clock3/><div><strong>{metrics.maintenance.length} entretien(s)</strong><small>à prévoir sous {settings.maintenanceHorizonDays} jours</small></div></Link>
      </div></aside>
      <section className="panel automation-wide"><div className="section-head"><div><h2>Quick actions</h2><p>Actions à fort levier, exécutées localement.</p></div></div><div className="automation-quick-grid">
        <button onClick={()=>{const n=data.generateDueMaintenanceVisits(settings.maintenanceHorizonDays);addLog('success','Maintenance',`${n} visite(s) générée(s).`)}}><Clock3/><strong>Générer visites</strong><small>Contrats arrivant à échéance</small></button>
        <button onClick={()=>{setQueue([]);addLog('info','File d’actions','File réinitialisée.');setTimeout(scan,0)}}><RefreshCcw/><strong>Reconstruire la file</strong><small>Repart des données actuelles</small></button>
        <Link to="/follow-ups"><MessageSquareText/><strong>Centre de relance</strong><small>Préparer appels et messages</small></Link>
        <Link to="/electronic-invoicing"><FileCheck2/><strong>Conformité factures</strong><small>Contrôler les dossiers électroniques</small></Link>
      </div></section>
    </div>}

    {tab==='rules'&&<div className="automation-grid">
      <section className="panel automation-wide"><div className="section-head"><div><h2>Règles automatiques</h2><p>Active, désactive et choisis l’action exécutée pour chaque événement.</p></div></div><div className="automation-rule-list">{rules.map(r=><article key={r.id} className={r.active?'active':'inactive'}>
        <button className={`auto-toggle ${r.active?'on':''}`} onClick={()=>toggleRule(r.id)} aria-label="Activer la règle"><span/></button>
        <div className="auto-main"><strong>{r.name}</strong><small>{triggerLabels[r.trigger]}</small></div>
        <label>Action<select value={r.action} onChange={e=>patchRule(r.id,{action:e.target.value as RuleAction})}><option value="create_followup">Créer une relance</option><option value="portal_message">Message portail client</option><option value="create_task">Créer une tâche</option>{r.trigger==='quote_accepted'&&<option value="convert_quote">Créer la facture</option>}{r.trigger==='maintenance_due'&&<option value="generate_visit">Générer une visite</option>}</select></label>
        <label>Délai anti-doublon<input type="number" min="1" max="720" value={r.cooldown_hours} onChange={e=>patchRule(r.id,{cooldown_hours:Number(e.target.value)||1})}/><small>heures</small></label>
      </article>)}</div></section>
      <aside className="panel"><h2>Paramètres</h2><div className="automation-settings">
        <label className="setting-switch"><span><strong>Analyse au démarrage</strong><small>Génère la file à l’ouverture du module</small></span><input type="checkbox" checked={settings.autoRun} onChange={e=>setSettings(s=>({...s,autoRun:e.target.checked}))}/></label>
        <label>Grâce impayés (jours)<input type="number" min="0" max="60" value={settings.overdueGraceDays} onChange={e=>setSettings(s=>({...s,overdueGraceDays:Number(e.target.value)||0}))}/></label>
        <label>Buffer stock<input type="number" min="0" value={settings.stockBuffer} onChange={e=>setSettings(s=>({...s,stockBuffer:Number(e.target.value)||0}))}/></label>
        <label>Échéance facture après devis (jours)<input type="number" min="1" max="120" value={settings.acceptedQuoteDueDays} onChange={e=>setSettings(s=>({...s,acceptedQuoteDueDays:Number(e.target.value)||14}))}/></label>
        <label>Horizon entretien (jours)<input type="number" min="1" max="365" value={settings.maintenanceHorizonDays} onChange={e=>setSettings(s=>({...s,maintenanceHorizonDays:Number(e.target.value)||30}))}/></label>
      </div></aside>
    </div>}

    {tab==='queue'&&<section className="panel"><div className="section-head"><div><h2>File d’actions</h2><p>{queue.length} action(s), tous statuts confondus.</p></div><button className="ghost" onClick={clearDone}><Trash2 size={16}/> Nettoyer terminées</button></div><div className="automation-queue-list">{queue.map(item=><article key={item.id} className={`${item.status} ${item.severity}`}>
      <div className="auto-main"><strong>{item.title}</strong><small>{item.detail}</small><span>{triggerLabels[item.trigger]} → {actionLabels[item.action]}</span></div><span className={`severity ${item.severity}`}>{item.severity}</span><span className={`queue-status ${item.status}`}>{item.status}</span><div className="row-actions">{item.status==='open'?<><button onClick={()=>execute(item)}>Exécuter</button><button className="ghost" onClick={()=>ignore(item.id)}>Ignorer</button></>:<button className="ghost" onClick={()=>reopen(item.id)}>Rouvrir</button>}</div>
    </article>)}{queue.length===0&&<div className="empty-state">File vide.</div>}</div></section>}

    {tab==='quality'&&<div className="automation-grid"><section className="panel automation-wide"><div className="section-head"><div><h2>Qualité des données</h2><p>Évite que les automatisations travaillent sur des dossiers incomplets.</p></div><span className={`score-pill ${qualityIssues?'mid':'good'}`}>{qualityIssues} anomalie(s)</span></div><div className="quality-check-grid">{qualityChecks.map(c=><Link to={c.href} key={c.label} className={c.count?c.level:'ok'}><div>{c.count?<AlertTriangle/>:<CheckCircle2/>}<strong>{c.label}</strong></div><b>{c.count}</b></Link>)}</div></section><aside className="panel"><h2>Checklist automatisable</h2><ul className="plain-list"><li>Coordonnées client complètes</li><li>Données B2B prêtes pour la facturation</li><li>Échéances présentes sur les factures</li><li>Responsable et adresse sur les interventions</li><li>SKU sur les articles suivis en stock</li></ul><Link className="button-link" to="/backup-center">Contrôler les sauvegardes</Link></aside></div>}

    {tab==='history'&&<section className="panel"><div className="section-head"><div><h2>Journal d’automatisation</h2><p>Traçabilité locale des analyses et exécutions.</p></div><button className="ghost" onClick={()=>setLogs([])}><Trash2 size={16}/> Vider</button></div><div className="automation-log-list">{logs.map(l=><article key={l.id} className={l.level}><div>{l.level==='success'?<CheckCircle2/>:l.level==='error'?<AlertTriangle/>:<Activity/>}</div><div className="auto-main"><strong>{l.action}</strong><small>{l.detail}</small></div><time>{new Date(l.created_at).toLocaleString('fr-FR')}</time></article>)}{logs.length===0&&<div className="empty-state">Aucune exécution enregistrée.</div>}</div></section>}
  </div>;
}
