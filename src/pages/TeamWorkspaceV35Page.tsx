import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BadgeCheck, Check, Clipboard, Clock3, Euro, History,
  ShieldCheck, ShieldQuestion, UserPlus, UserRoundCog, UsersRound, X
} from 'lucide-react';
import { useAuth, type AccountRole, type AccountUser } from '../context/AuthContext';

type Invitation={id:string;email:string;role:AccountRole;workspaceId:string;code:string;createdAt:string;expiresAt:string;acceptedAt:string|null};
type ApprovalKind='expense'|'discount'|'payment'|'data_restore'|'role_change'|'purchase'|'custom';
type ApprovalStatus='pending'|'approved'|'rejected';
type Approval={
 id:string;workspaceId:string;requesterId:string;requesterName:string;requesterRole:AccountRole;
 title:string;detail:string;kind:ApprovalKind;route:string;amount:number;status:ApprovalStatus;
 createdAt:string;decidedAt:string|null;decidedById:string|null;decidedByName:string|null;decisionNote:string;
};
type AuditRow={id:string;createdAt:string;actor?:string;action:string;detail?:string};

const roleLabel:Record<AccountRole,string>={admin:'Administrateur',manager:'Manager',employee:'Employé'};
const kindLabel:Record<ApprovalKind,string>={
 expense:'Dépense',discount:'Remise',payment:'Paiement',data_restore:'Restauration',
 role_change:'Changement de rôle',purchase:'Achat',custom:'Autre'
};
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2});

export function TeamWorkspaceV35Page(){
 const {apiUrl,token,user}=useAuth();
 const [users,setUsers]=useState<AccountUser[]>([]);
 const [invitations,setInvitations]=useState<Invitation[]>([]);
 const [approvals,setApprovals]=useState<Approval[]>([]);
 const [audit,setAudit]=useState<AuditRow[]>([]);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const serverMode=!!token&&token!=='local-device';

 const load=useCallback(async()=>{
  if(!serverMode)return;
  setError('');
  try{
   const requests=[
    fetch(`${apiUrl}/api/users`,{headers}),
    fetch(`${apiUrl}/api/invitations`,{headers}),
    fetch(`${apiUrl}/api/approvals`,{headers}),
    fetch(`${apiUrl}/api/saas/audit`,{headers})
   ];
   const [u,i,a,l]=await Promise.all(requests);
   const [ub,ib,ab,lb]=await Promise.all([u.json(),i.json(),a.json(),l.json()]);
   if(!u.ok)throw new Error(ub.error);
   if(!i.ok)throw new Error(ib.error);
   if(!a.ok)throw new Error(ab.error);
   if(!l.ok)throw new Error(lb.error);
   setUsers(ub.users||[]);
   setInvitations(ib.invitations||[]);
   setApprovals(ab.approvals||[]);
   setAudit((lb.rows||[]).filter((row:AuditRow)=>row.action.startsWith('approval.')).slice(0,30));
  }catch(err){setError(err instanceof Error?err.message:'Chargement impossible.')}
 },[apiUrl,token,serverMode]);

 useEffect(()=>{void load()},[load]);

 const invite=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setBusy(true);setError('');setMessage('');
  const form=e.currentTarget,fd=new FormData(form);
  try{
   const response=await fetch(`${apiUrl}/api/invitations`,{
    method:'POST',headers,
    body:JSON.stringify({email:String(fd.get('email')||''),role:String(fd.get('role')||'employee')})
   });
   const body=await response.json();if(!response.ok)throw new Error(body.error);
   setInvitations(rows=>[body.invitation,...rows.filter(x=>x.id!==body.invitation.id)]);
   setMessage('Invitation créée. Le code peut être transmis au collaborateur.');
   form.reset();
  }catch(err){setError(err instanceof Error?err.message:'Invitation impossible.')}
  finally{setBusy(false)}
 };

 const createApproval=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setBusy(true);setError('');setMessage('');
  const form=e.currentTarget,fd=new FormData(form);
  try{
   const response=await fetch(`${apiUrl}/api/approvals`,{
    method:'POST',headers,
    body:JSON.stringify({
     title:String(fd.get('title')||''),
     detail:String(fd.get('detail')||''),
     kind:String(fd.get('kind')||'custom'),
     amount:Number(fd.get('amount')||0),
     route:String(fd.get('route')||'')
    })
   });
   const body=await response.json();if(!response.ok)throw new Error(body.error);
   setApprovals(rows=>[body.approval,...rows]);
   setMessage('Demande envoyée pour validation.');
   form.reset();
  }catch(err){setError(err instanceof Error?err.message:'Demande impossible.')}
  finally{setBusy(false)}
 };

 const decide=async(item:Approval,decision:'approved'|'rejected')=>{
  const label=decision==='approved'?'approuver':'refuser';
  const note=prompt(`Note pour ${label} « ${item.title} » (facultatif) :`)??'';
  try{
   const response=await fetch(`${apiUrl}/api/approvals/${item.id}/decision`,{
    method:'PUT',headers,body:JSON.stringify({decision,note})
   });
   const body=await response.json();if(!response.ok)throw new Error(body.error);
   setApprovals(rows=>rows.map(x=>x.id===item.id?body.approval:x));
   setMessage(decision==='approved'?'Demande approuvée.':'Demande refusée.');
   void load();
  }catch(err){setError(err instanceof Error?err.message:'Décision impossible.')}
 };

 const cancel=async(item:Approval)=>{
  if(!confirm(`Annuler la demande « ${item.title} » ?`))return;
  try{
   const response=await fetch(`${apiUrl}/api/approvals/${item.id}`,{method:'DELETE',headers});
   const body=await response.json();if(!response.ok)throw new Error(body.error);
   setApprovals(rows=>rows.filter(x=>x.id!==item.id));
   setMessage('Demande annulée.');
  }catch(err){setError(err instanceof Error?err.message:'Annulation impossible.')}
 };

 const copy=async(code:string)=>{await navigator.clipboard.writeText(code);setMessage('Code d’invitation copié.')};
 const pending=approvals.filter(a=>a.status==='pending');
 const resolved=approvals.filter(a=>a.status!=='pending');
 const canManage=user?.role==='admin'||user?.role==='manager';
 const canDecide=canManage;
 const ownPending=pending.filter(a=>a.requesterId===user?.id).length;

 const roleCounts=useMemo(()=>({
  admins:users.filter(u=>u.role==='admin').length,
  managers:users.filter(u=>u.role==='manager').length,
  employees:users.filter(u=>u.role==='employee').length
 }),[users]);

 if(!serverMode)return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 35 · TEAM WORKSPACE</p><h1>Équipe & validations</h1><p>Cette fonction nécessite un compte serveur pour partager rôles, invitations et décisions entre appareils.</p></div><UsersRound/></div><section className="panel"><ShieldQuestion/><h2>Mode local actif</h2><p>Connecte un compte CloserFlow serveur, puis reviens ici. Tes données locales restent disponibles.</p><Link className="primary-button" to="/login">Se connecter</Link></section></>;

 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 35 · TEAM WORKSPACE</p><h1>Équipe & validations</h1><p>Travail multi-utilisateurs avec rôles, demandes sensibles et journal de décision par workspace.</p></div><UsersRound/></div>

 {error&&<p className="form-error">{error}</p>}
 {message&&<p className="form-success">{message}</p>}

 <section className="v35-kpis">
  <article><UsersRound/><span>Membres</span><strong>{users.length}</strong><small>{roleCounts.admins} admin · {roleCounts.managers} manager · {roleCounts.employees} employé</small></article>
  <article><Clock3/><span>À valider</span><strong>{pending.length}</strong><small>{ownPending} demande(s) créée(s) par vous</small></article>
  <article><UserPlus/><span>Invitations</span><strong>{invitations.length}</strong><small>Codes actifs</small></article>
  <article><ShieldCheck/><span>Décisions</span><strong>{resolved.length}</strong><small>Approuvées ou refusées</small></article>
 </section>

 <section className="v35-grid">
  <div className="panel">
   <div className="section-heading"><div><p className="eyebrow">DEMANDE</p><h2>Faire valider une action</h2></div><ShieldCheck/></div>
   <form className="v35-form" onSubmit={createApproval}>
    <label>Type<select name="kind" defaultValue="purchase"><option value="purchase">Achat</option><option value="expense">Dépense</option><option value="discount">Remise commerciale</option><option value="payment">Paiement</option><option value="data_restore">Restauration de données</option><option value="role_change">Changement de rôle</option><option value="custom">Autre</option></select></label>
    <label>Objet<input name="title" required minLength={3} placeholder="Achat matériel chantier"/></label>
    <label>Montant concerné (€)<input name="amount" type="number" min="0" step="0.01" defaultValue="0"/></label>
    <label>Module / route<input name="route" placeholder="/expenses"/></label>
    <label className="v35-wide">Détail<textarea name="detail" rows={4} placeholder="Explique ce qui doit être validé…"/></label>
    <button className="primary v35-wide" disabled={busy}><ShieldCheck/>{busy?'Envoi…':'Demander la validation'}</button>
   </form>
  </div>

  {canManage&&<div className="panel">
   <div className="section-heading"><div><p className="eyebrow">ÉQUIPE</p><h2>Inviter un membre</h2></div><UserPlus/></div>
   <form className="v35-form" onSubmit={invite}>
    <label className="v35-wide">E-mail<input type="email" name="email" required placeholder="collaborateur@entreprise.fr"/></label>
    <label>Rôle<select name="role" defaultValue="employee"><option value="employee">Employé</option><option value="manager">Manager</option></select></label>
    <button className="primary" disabled={busy}><UserPlus/>Créer l’invitation</button>
   </form>
   <div className="v35-invites">{invitations.slice(0,6).map(i=><article key={i.id}><div><strong>{i.email}</strong><small>{roleLabel[i.role]} · expire {new Date(i.expiresAt).toLocaleDateString('fr-FR')}</small><code>{i.code}</code></div><button className="ghost" onClick={()=>copy(i.code)}><Clipboard/>Copier</button></article>)}</div>
  </div>}
 </section>

 <section className="panel">
  <div className="section-heading"><div><p className="eyebrow">À DÉCIDER</p><h2>File d’approbation</h2></div><Clock3/></div>
  <div className="v35-approval-list">
   {pending.length===0?<div className="empty-state"><BadgeCheck/><strong>Aucune validation en attente</strong><p>L’équipe est à jour.</p></div>:
   pending.map(item=><article key={item.id}>
    <div className="v35-approval-main">
     <span className="role-chip">{kindLabel[item.kind]}</span>
     <strong>{item.title}</strong>
     <small>Demandé par {item.requesterName} le {new Date(item.createdAt).toLocaleString('fr-FR')}</small>
     {item.detail&&<p>{item.detail}</p>}
    </div>
    <div className="v35-approval-value">{item.amount>0&&<b><Euro/>{euro.format(item.amount)}</b>}{item.route&&<Link to={item.route}>Ouvrir le module</Link>}</div>
    <div className="v35-approval-actions">
     {canDecide&&item.requesterId!==user?.id&&<><button className="ghost v35-approve" onClick={()=>decide(item,'approved')}><Check/>Approuver</button><button className="ghost danger" onClick={()=>decide(item,'rejected')}><X/>Refuser</button></>}
     {(item.requesterId===user?.id||user?.role==='admin')&&<button className="ghost" onClick={()=>cancel(item)}>Annuler</button>}
    </div>
   </article>)}
  </div>
 </section>

 <section className="v35-grid">
  <div className="panel">
   <div className="section-heading"><div><p className="eyebrow">MEMBRES</p><h2>Workspace {user?.workspaceId}</h2></div><UserRoundCog/></div>
   <div className="v35-members">{users.map(member=><article key={member.id}><div><strong>{member.displayName}{member.id===user?.id?' · vous':''}</strong><small>{member.email}</small></div><span className="role-chip">{roleLabel[member.role]}</span></article>)}</div>
   <Link className="secondary-button" to="/accounts"><UserRoundCog/>Gérer les rôles</Link>
  </div>

  <div className="panel">
   <div className="section-heading"><div><p className="eyebrow">JOURNAL</p><h2>Décisions récentes</h2></div><History/></div>
   <div className="v35-audit">{audit.length===0?<p>Aucune décision enregistrée.</p>:audit.map(row=><article key={row.id}><div><strong>{row.action.replace('approval.','')}</strong><small>{row.actor||'Utilisateur'} · {new Date(row.createdAt).toLocaleString('fr-FR')}</small></div><p>{row.detail}</p></article>)}</div>
  </div>
 </section>

 <aside className="cloud-warning"><AlertTriangle/><div><strong>Approvals V35 = contrôle de décision.</strong><p>Une approbation n’exécute pas automatiquement un paiement, une restauration ou un achat : elle conserve une validation auditable avant l’action métier.</p></div></aside>
 </>;
}
