import { useEffect,useState } from 'react';
import { Database, LockKeyhole, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchTenantStatusV63,type TenantStatusV63 } from '../lib/tenantSecurityV63';

export function TenantSecurityV63Page(){
 const {apiUrl,token}=useAuth(); const [status,setStatus]=useState<TenantStatusV63|null>(null); const [error,setError]=useState('');
 useEffect(()=>{
  if(!token||token==='local-device')return;
  fetchTenantStatusV63(apiUrl,token).then(setStatus).catch(e=>setError(e instanceof Error?e.message:'Erreur'));
 },[apiUrl,token]);
 return <>
  <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 63 · TENANT ISOLATION</p><h1>Isolation des entreprises</h1><p>Chaque workspace doit rester confiné à son propre stockage et ses propres droits.</p></div><ShieldCheck/></div>
  <section className="v63-grid">
   <article><LockKeyhole/><div><strong>Isolation</strong><span>{status?.isolated?'Active':'À vérifier sur le backend'}</span></div></article>
   <article><Database/><div><strong>Écritures atomiques</strong><span>{status?.atomicWrites?'Actives':'À vérifier'}</span></div></article>
   <article><ShieldCheck/><div><strong>Chemins confinés</strong><span>{status?.storageConfined?'Actifs':'À vérifier'}</span></div></article>
  </section>
  {status&&<section className="panel"><h2>Workspace courant</h2><p><strong>{status.workspaceId}</strong></p><p>Fichier serveur : {status.storageFile}</p></section>}
  {error&&<div className="notice"><TriangleAlert/><span>{error}</span></div>}
 </>;
}
