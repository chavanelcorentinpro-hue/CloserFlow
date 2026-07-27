import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArchiveRestore, BadgeCheck, Building2, CheckCircle2,
  CircleAlert, DatabaseZap, FileCheck2, FileText, Gauge, MailWarning,
  PackageSearch, ReceiptText, ShieldCheck, UsersRound
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { totals } from '../lib/documents';

type Severity='critical'|'warning'|'info';
type Finding={id:string;severity:Severity;title:string;detail:string;route:string};

const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const normalize=(value:string|null|undefined)=>(value??'').trim().toLowerCase().replace(/\s+/g,'');
const clientName=(c:{first_name:string;last_name:string;company_name:string|null})=>c.company_name||`${c.first_name} ${c.last_name}`;

export function DataHealthV33Page(){
 const {
  company,clients,missions,quotes,invoices,businessExpenses,maintenanceContracts,
  inventory,portalMessages,appointmentRequests
 }=useAppData();

 const report=useMemo(()=>{
  const findings:Finding[]=[];
  const clientIds=new Set(clients.map(c=>c.id));
  const missionIds=new Set(missions.map(m=>m.id));
  const quoteIds=new Set(quotes.map(q=>q.id));

  const orphanMissions=missions.filter(m=>m.client_id&&!clientIds.has(m.client_id));
  if(orphanMissions.length) findings.push({
   id:'orphan-missions',severity:'critical',title:'Chantiers sans client',
   detail:`${orphanMissions.length} mission(s) pointent vers un client introuvable.`,
   route:'/missions'
  });

  const orphanQuotes=quotes.filter(q=>
   (q.client_id&&!clientIds.has(q.client_id)) ||
   (q.mission_id&&!missionIds.has(q.mission_id))
  );
  if(orphanQuotes.length) findings.push({
   id:'orphan-quotes',severity:'critical',title:'Devis avec référence cassée',
   detail:`${orphanQuotes.length} devis ont un client ou chantier introuvable.`,
   route:'/quotes'
  });

  const orphanInvoices=invoices.filter(i=>
   (i.client_id&&!clientIds.has(i.client_id)) ||
   (i.mission_id&&!missionIds.has(i.mission_id)) ||
   (i.quote_id&&!quoteIds.has(i.quote_id))
  );
  if(orphanInvoices.length) findings.push({
   id:'orphan-invoices',severity:'critical',title:'Factures avec référence cassée',
   detail:`${orphanInvoices.length} facture(s) doivent être vérifiées.`,
   route:'/invoices'
  });

  const orphanExpenses=businessExpenses.filter(e=>e.mission_id&&!missionIds.has(e.mission_id));
  if(orphanExpenses.length) findings.push({
   id:'orphan-expenses',severity:'warning',title:'Dépenses hors chantier',
   detail:`${orphanExpenses.length} dépense(s) référencent un chantier introuvable.`,
   route:'/expenses'
  });

  const orphanContracts=maintenanceContracts.filter(c=>c.client_id&&!clientIds.has(c.client_id));
  if(orphanContracts.length) findings.push({
   id:'orphan-contracts',severity:'warning',title:'Contrats sans client',
   detail:`${orphanContracts.length} contrat(s) d’entretien ont perdu leur client.`,
   route:'/contracts'
  });

  const orphanMessages=portalMessages.filter(m=>!clientIds.has(m.client_id));
  const orphanAppointments=appointmentRequests.filter(a=>
   !clientIds.has(a.client_id) || (a.mission_id&&!missionIds.has(a.mission_id))
  );
  if(orphanMessages.length||orphanAppointments.length) findings.push({
   id:'portal-orphans',severity:'warning',title:'Portail client à nettoyer',
   detail:`${orphanMessages.length} message(s) et ${orphanAppointments.length} demande(s) ont une référence absente.`,
   route:'/client-experience-v17'
  });

  const numberDuplicates=(values:string[])=>{
   const seen=new Set<string>(),dup=new Set<string>();
   values.forEach(v=>{const n=normalize(v);if(!n)return;if(seen.has(n))dup.add(v);else seen.add(n)});
   return [...dup];
  };
  const duplicateQuoteNumbers=numberDuplicates(quotes.map(q=>q.number));
  const duplicateInvoiceNumbers=numberDuplicates(invoices.map(i=>i.number));
  if(duplicateQuoteNumbers.length||duplicateInvoiceNumbers.length) findings.push({
   id:'duplicate-numbers',severity:'critical',title:'Numéros de documents en double',
   detail:`${duplicateQuoteNumbers.length} numéro(s) de devis et ${duplicateInvoiceNumbers.length} numéro(s) de facture en doublon.`,
   route:'/invoices'
  });

  const duplicateClients=new Set<string>();
  const identityMap=new Map<string,string>();
  clients.forEach(c=>{
   const tokens=[normalize(c.email),normalize(c.phone)].filter(Boolean);
   for(const token of tokens){
    const previous=identityMap.get(token);
    if(previous&&previous!==c.id)duplicateClients.add(c.id);
    else identityMap.set(token,c.id);
   }
  });
  if(duplicateClients.size) findings.push({
   id:'duplicate-clients',severity:'warning',title:'Clients potentiellement en double',
   detail:`${duplicateClients.size} fiche(s) partagent un e-mail ou téléphone avec une autre fiche.`,
   route:'/clients'
  });

  const weakClients=clients.filter(c=>!c.phone&&!c.email);
  if(weakClients.length) findings.push({
   id:'weak-clients',severity:'info',title:'Coordonnées client incomplètes',
   detail:`${weakClients.length} client(s) n’ont ni téléphone ni e-mail.`,
   route:'/clients'
  });

  const businessClients=clients.filter(c=>c.customer_type==='business');
  const incompleteBusiness=businessClients.filter(c=>!c.siren||!c.address||!c.email);
  if(incompleteBusiness.length) findings.push({
   id:'b2b-incomplete',severity:'warning',title:'Fiches B2B à compléter',
   detail:`${incompleteBusiness.length} entreprise(s) ont des données manquantes pour une facturation propre.`,
   route:'/clients'
  });

  const companyMissing=[
   !company.name?'raison sociale':null,
   !company.siret?'SIRET':null,
   !company.address?'adresse':null,
   !company.email?'e-mail':null
  ].filter(Boolean);
  if(companyMissing.length) findings.push({
   id:'company-missing',severity:'warning',title:'Profil entreprise incomplet',
   detail:`À renseigner : ${companyMissing.join(', ')}.`,
   route:'/settings'
  });

  const lowStock=inventory.filter(i=>i.quantity<=i.minimum_quantity);
  if(lowStock.length) findings.push({
   id:'low-stock',severity:'info',title:'Stock sous seuil',
   detail:`${lowStock.length} article(s) sont à réapprovisionner.`,
   route:'/inventory'
  });

  const overdueValue=invoices.reduce((sum,i)=>{
   if(i.status!=='overdue')return sum;
   const total=totals(i.lines,i.discount_percent,i.vat_rate).ttc;
   const paid=(i.payments??[]).reduce((s,p)=>s+p.amount,0);
   return sum+Math.max(0,total-paid);
  },0);
  if(overdueValue>0) findings.push({
   id:'overdue',severity:'warning',title:'Créances en retard',
   detail:`${euro.format(overdueValue)} restent à encaisser sur des factures en retard.`,
   route:'/follow-ups'
  });

  const critical=findings.filter(f=>f.severity==='critical').length;
  const warning=findings.filter(f=>f.severity==='warning').length;
  const info=findings.filter(f=>f.severity==='info').length;
  const score=Math.max(0,Math.min(100,100-critical*18-warning*7-info*2));
  const clean=critical===0&&warning===0;

  return {
   findings,critical,warning,info,score,clean,lowStock:lowStock.length,
   weakClients:weakClients.length,businessClients:businessClients.length,
   incompleteBusiness:incompleteBusiness.length
  };
 },[company,clients,missions,quotes,invoices,businessExpenses,maintenanceContracts,inventory,portalMessages,appointmentRequests]);

 return <>
  <div className="page-title">
   <div>
    <p className="eyebrow">CLOSERFLOW 33 · DATA HEALTH</p>
    <h1>Qualité & sécurité des données</h1>
    <p>Contrôle les liens entre clients, chantiers, devis et factures avant qu’une erreur ne devienne un problème de gestion.</p>
   </div>
   <Link className="primary" to="/backup-center"><ArchiveRestore/>Sauvegarder</Link>
  </div>

  <section className="v33-kpis">
   <article><Gauge/><span>Score qualité</span><strong>{report.score}/100</strong></article>
   <article><CircleAlert/><span>Critiques</span><strong>{report.critical}</strong></article>
   <article><AlertTriangle/><span>À corriger</span><strong>{report.warning}</strong></article>
   <article><PackageSearch/><span>Stock bas</span><strong>{report.lowStock}</strong></article>
   <article><UsersRound/><span>Clients sans contact</span><strong>{report.weakClients}</strong></article>
  </section>

  {report.clean&&
   <div className="notice v33-success">
    <CheckCircle2/>
    <span><strong>Données cohérentes.</strong> Aucun problème critique ou important détecté.</span>
   </div>
  }

  <section className="v33-grid">
   <div className="panel">
    <div className="section-heading">
     <div><p className="eyebrow">DIAGNOSTIC</p><h2>Points à traiter</h2></div>
     <DatabaseZap/>
    </div>
    <div className="v33-findings">
     {report.findings.length===0?
      <div className="empty-state"><BadgeCheck/><strong>Aucune anomalie</strong><p>Les données principales sont cohérentes.</p></div>:
      report.findings.map(f=>
       <Link to={f.route} key={f.id} className={`v33-finding ${f.severity}`}>
        {f.severity==='critical'?<CircleAlert/>:f.severity==='warning'?<AlertTriangle/>:<ShieldCheck/>}
        <div><strong>{f.title}</strong><small>{f.detail}</small></div>
       </Link>
      )
     }
    </div>
   </div>

   <div className="panel">
    <div className="section-heading">
     <div><p className="eyebrow">FACTURATION</p><h2>Préparation des dossiers</h2></div>
     <FileCheck2/>
    </div>
    <div className="v33-readiness">
     <article>
      <Building2/>
      <div><strong>Entreprise</strong><small>Identité légale, SIRET, adresse et e-mail</small></div>
      <b>{report.findings.some(f=>f.id==='company-missing')?'À compléter':'OK'}</b>
     </article>
     <article>
      <UsersRound/>
      <div><strong>Clients professionnels</strong><small>{report.businessClients} fiche(s) B2B</small></div>
      <b>{report.incompleteBusiness?`${report.incompleteBusiness} à compléter`:'OK'}</b>
     </article>
     <article>
      <FileText/>
      <div><strong>Devis</strong><small>Numérotation et références liées</small></div>
      <b>{report.findings.some(f=>f.id==='orphan-quotes'||f.id==='duplicate-numbers')?'À vérifier':'OK'}</b>
     </article>
     <article>
      <ReceiptText/>
      <div><strong>Factures</strong><small>Références et unicité des numéros</small></div>
      <b>{report.findings.some(f=>f.id==='orphan-invoices'||f.id==='duplicate-numbers')?'À vérifier':'OK'}</b>
     </article>
    </div>
   </div>
  </section>

  <section className="panel">
   <div className="section-heading">
    <div><p className="eyebrow">SÉCURITÉ</p><h2>Avant une grosse modification</h2></div>
    <ShieldCheck/>
   </div>
   <p>Crée un point de sauvegarde avant d’importer, restaurer ou nettoyer des données. V33 n’efface et ne fusionne rien automatiquement.</p>
   <div className="action-row">
    <Link className="primary-button" to="/backup-center"><ArchiveRestore/>Sauvegarde & restauration</Link>
    <Link className="secondary-button" to="/electronic-invoicing"><MailWarning/>Facturation électronique</Link>
   </div>
  </section>
 </>;
}
