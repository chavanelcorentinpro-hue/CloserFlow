import { useEffect,useState } from 'react';
import { Database, HardDriveDownload, RefreshCw, Server, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createBackupV64,fetchDbHealthV64,listBackupsV64,type DbHealthV64 } from '../lib/databaseV64';

export function DatabaseV64Page(){
 const {apiUrl,token,user}=useAuth();
 const [health,setHealth]=useState<DbHealthV64|null>(null);
 const [backups,setBackups]=useState<string[]>([]);
 const [error,setError]=useState('');
 const load=async()=>{setError('');try{
  if(!token||token==='local-device')throw new Error('Connexion serveur requise.');
  setHealth(await fetchDbHealthV64(apiUrl,token));
  if(user?.role==='admin')setBackups((await listBackupsV64(apiUrl,token)).backups);
 }catch(e){setError(e instanceof Error?e.message:'Erreur')}};
 useEffect(()=>{void load()},[apiUrl,token]);
 const backup=async()=>{try{await createBackupV64(apiUrl,token);await load()}catch(e){setError(e instanceof Error?e.message:'Erreur sauvegarde')}};

 return <>
  <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 64 · DATABASE</p><h1>Base de données & sauvegardes</h1><p>État du stockage persistant utilisé par le backend.</p></div><Database/></div>
  <section className="v64-grid">
   <article><Server/><div><strong>Backend</strong><span>{health?.backend||'Non connecté'}</span></div></article>
   <article><ShieldCheck/><div><strong>Workspace</strong><span>{health?.currentWorkspace||'—'}</span></div></article>
   <article><Database/><div><strong>Workspaces stockés</strong><span>{health?.workspaceCount??'—'}</span></div></article>
   <article><HardDriveDownload/><div><strong>Sauvegardes</strong><span>{backups.length}</span></div></article>
  </section>
  <div className="action-row"><button className="secondary-button" onClick={load}><RefreshCw/>Actualiser</button>{user?.role==='admin'&&<button className="primary-button" onClick={backup}><HardDriveDownload/>Créer une sauvegarde</button>}</div>
  {backups.length>0&&<section className="panel"><h2>Sauvegardes disponibles</h2><div className="stack">{backups.slice(0,20).map(x=><span key={x}>{x}</span>)}</div></section>}
  {error&&<div className="notice"><TriangleAlert/><span>{error}</span></div>}
 </>;
}
