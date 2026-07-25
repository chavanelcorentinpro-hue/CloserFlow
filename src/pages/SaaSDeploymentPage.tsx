import { useEffect, useState } from 'react';
import { CloudCog, DatabaseBackup, Download, HardDrive, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Status={workspaceId:string;plan:string;limits:{users:number;storageMb:number};usage:{users:number;activeSessions:number;storageBytes:number;revision:number};security:Record<string,string|boolean>;lastAuditAt:string|null};
type AuditRow={id:string;createdAt:string;actor?:string;action:string;detail?:string};
export function SaaSDeploymentPage(){
 const {apiUrl,token}=useAuth(); const [status,setStatus]=useState<Status|null>(null); const [rows,setRows]=useState<AuditRow[]>([]); const [error,setError]=useState('');
 const headers={Authorization:`Bearer ${token}`};
 const load=async()=>{try{setError('');const [a,b]=await Promise.all([fetch(`${apiUrl}/api/saas/status`,{headers}),fetch(`${apiUrl}/api/saas/audit`,{headers})]);if(!a.ok||!b.ok)throw new Error('Impossible de charger le centre SaaS.');setStatus(await a.json());setRows((await b.json()).rows||[]);}catch(e){setError(e instanceof Error?e.message:'Erreur inconnue');}};
 useEffect(()=>{void load();},[apiUrl,token]);
 const backup=async()=>{const res=await fetch(`${apiUrl}/api/saas/backup`,{headers});if(!res.ok){setError('Export réservé aux administrateurs et responsables.');return;}const blob=new Blob([JSON.stringify(await res.json(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`closerflow-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);void load();};
 const mb=status?status.usage.storageBytes/1024/1024:0;
 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 11.1</p><h1>Déploiement SaaS</h1><p className="muted">Isolation par entreprise, supervision, audit et sauvegarde exportable.</p></div><button className="primary-button" onClick={backup}><Download size={18}/>Sauvegarder</button></div>
 {error&&<div className="empty-state">{error}</div>}
 <div className="stats-grid">
  <div className="stat-card"><Users/><span>Utilisateurs</span><strong>{status?.usage.users??'—'} / {status?.limits.users??'—'}</strong></div>
  <div className="stat-card"><CloudCog/><span>Sessions actives</span><strong>{status?.usage.activeSessions??'—'}</strong></div>
  <div className="stat-card"><HardDrive/><span>Stockage données</span><strong>{mb.toFixed(2)} Mo</strong></div>
  <div className="stat-card"><DatabaseBackup/><span>Révision cloud</span><strong>{status?.usage.revision??'—'}</strong></div>
 </div>
 <section className="panel"><div className="section-heading"><div><p className="eyebrow">SÉCURITÉ</p><h2>Socle multi-tenant</h2></div><ShieldCheck/></div><div className="detail-grid"><div><span>Espace isolé</span><strong>{status?.workspaceId||'—'}</strong></div><div><span>Hash mot de passe</span><strong>{String(status?.security.passwordHashing||'—')}</strong></div><div><span>Sessions Bearer</span><strong>{status?.security.bearerSessions?'Actives':'Inactives'}</strong></div><div><span>Journal d’audit</span><strong>{status?.security.auditLog?'Actif':'Inactif'}</strong></div></div></section>
 <section className="panel"><div className="section-heading"><div><p className="eyebrow">AUDIT</p><h2>Dernières actions serveur</h2></div></div>{rows.length===0?<div className="empty-state">Aucune action auditée pour cet espace.</div>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Détail</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.createdAt).toLocaleString('fr-FR')}</td><td>{r.actor||'Système'}</td><td>{r.action}</td><td>{r.detail||'—'}</td></tr>)}</tbody></table></div>}</section>
 <div className="notice-card"><strong>Limite actuelle</strong><p>Cette version fournit un socle SaaS auto-hébergé. PostgreSQL, stockage S3, paiements d’abonnement et sauvegardes planifiées nécessitent encore une infrastructure externe.</p></div></>;
}
