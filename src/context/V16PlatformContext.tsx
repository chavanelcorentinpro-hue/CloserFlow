import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createId } from '../lib/id';
import { useAppData, type BackupPayload } from './AppDataContext';
import { useAuth, type AccountRole } from './AuthContext';

export type V16Permission = 'dashboard.read'|'clients.write'|'documents.write'|'missions.write'|'planning.write'|'finance.write'|'team.manage'|'settings.manage'|'cloud.manage'|'backup.restore';
export type V16Device = { id:string; label:string; platform:string; lastSeenAt:string; trusted:boolean; revoked:boolean; createdAt:string };
export type V16Notice = { id:string; level:'info'|'warning'|'critical'|'success'; title:string; detail:string; route?:string; read:boolean; createdAt:string };
export type V16Backup = { id:string; label:string; createdAt:string; bytes:number; payload:BackupPayload };
export type V16SecurityEvent = { id:string; type:string; detail:string; createdAt:string };

const PERMISSIONS:Record<AccountRole,V16Permission[]>={
 admin:['dashboard.read','clients.write','documents.write','missions.write','planning.write','finance.write','team.manage','settings.manage','cloud.manage','backup.restore'],
 manager:['dashboard.read','clients.write','documents.write','missions.write','planning.write','finance.write','team.manage','cloud.manage','backup.restore'],
 employee:['dashboard.read','clients.write','documents.write','missions.write','planning.write'],
};

type Value={
 devices:V16Device[]; notices:V16Notice[]; backups:V16Backup[]; securityEvents:V16SecurityEvent[]; role:AccountRole; permissions:V16Permission[];
 can:(permission:V16Permission)=>boolean; unread:number; lastBackupAt:string|null;
 registerCurrentDevice:()=>void; toggleDeviceTrust:(id:string)=>void; revokeDevice:(id:string)=>void;
 addNotice:(notice:Omit<V16Notice,'id'|'read'|'createdAt'>)=>void; markNoticeRead:(id:string)=>void; markAllRead:()=>void;
 createBackup:(label?:string)=>V16Backup|null; restoreBackup:(id:string)=>boolean; deleteBackup:(id:string)=>void; runSecurityAudit:()=>V16SecurityEvent[];
};

const Ctx=createContext<Value|null>(null);
const K={devices:'closerflow.v16.devices',notices:'closerflow.v16.notices',backups:'closerflow.v16.backups',security:'closerflow.v16.security'};
const read=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}};
const deviceId=()=>{const key='closerflow.v16.device-id';let id=localStorage.getItem(key);if(!id){id=createId();localStorage.setItem(key,id)}return id};
const currentPlatform=()=>{const ua=navigator.userAgent||'';return /Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':'Web'};

export function V16PlatformProvider({children}:{children:ReactNode}){
 const {exportBackup,importBackup,clients,missions,invoices,quotes,inventory}=useAppData();
 const {user}=useAuth();
 const role=(user?.role??'admin') as AccountRole;
 const [devices,setDevices]=useState<V16Device[]>(()=>read(K.devices,[]));
 const [notices,setNotices]=useState<V16Notice[]>(()=>read(K.notices,[]));
 const [backups,setBackups]=useState<V16Backup[]>(()=>read(K.backups,[]));
 const [securityEvents,setSecurityEvents]=useState<V16SecurityEvent[]>(()=>read(K.security,[]));
 useEffect(()=>localStorage.setItem(K.devices,JSON.stringify(devices)),[devices]);
 useEffect(()=>localStorage.setItem(K.notices,JSON.stringify(notices.slice(0,200))),[notices]);
 useEffect(()=>{try{localStorage.setItem(K.backups,JSON.stringify(backups.slice(0,3)))}catch{/* quota: keep runtime copy */}},[backups]);
 useEffect(()=>localStorage.setItem(K.security,JSON.stringify(securityEvents.slice(0,200))),[securityEvents]);

 const registerCurrentDevice=useCallback(()=>{const id=deviceId(),now=new Date().toISOString();setDevices(rows=>{const found=rows.find(x=>x.id===id);if(found)return rows.map(x=>x.id===id?{...x,lastSeenAt:now,revoked:false}:x);return [{id,label:`${currentPlatform()} · appareil principal`,platform:currentPlatform(),lastSeenAt:now,trusted:true,revoked:false,createdAt:now},...rows]})},[]);
 useEffect(()=>{registerCurrentDevice()},[registerCurrentDevice]);

 const addNotice=useCallback((input:Omit<V16Notice,'id'|'read'|'createdAt'>)=>setNotices(rows=>[{...input,id:createId(),read:false,createdAt:new Date().toISOString()},...rows].slice(0,200)),[]);
 const createBackup=useCallback((label='Sauvegarde manuelle')=>{try{const payload=exportBackup();const json=JSON.stringify(payload);const row:V16Backup={id:createId(),label,createdAt:new Date().toISOString(),bytes:new Blob([json]).size,payload};setBackups(rows=>[row,...rows].slice(0,3));addNotice({level:'success',title:'Sauvegarde créée',detail:`${label} · ${(row.bytes/1024).toFixed(0)} Ko`});return row}catch{return null}},[exportBackup,addNotice]);
 const restoreBackup=useCallback((id:string)=>{const row=backups.find(x=>x.id===id);if(!row)return false;try{importBackup(row.payload);addNotice({level:'success',title:'Restauration terminée',detail:row.label});return true}catch{return false}},[backups,importBackup,addNotice]);
 const runSecurityAudit=useCallback(()=>{const now=new Date().toISOString();const rows:V16SecurityEvent[]=[];const push=(type:string,detail:string)=>rows.push({id:createId(),type,detail,createdAt:now});
   if(devices.filter(x=>!x.revoked).length>3)push('devices','Plus de 3 appareils actifs.');
   if(devices.some(x=>!x.trusted&&!x.revoked))push('trust','Un appareil actif n’est pas approuvé.');
   if(!user)push('session','Session locale : cloud et contrôle serveur limités.');
   if(backups.length===0)push('backup','Aucune sauvegarde v16 disponible.');
   const overdue=invoices.filter(i=>i.status==='overdue').length;if(overdue)push('finance',`${overdue} facture(s) en retard à traiter.`);
   const weakClients=clients.filter(c=>!c.email&&!c.phone).length;if(weakClients)push('data',`${weakClients} client(s) sans e-mail ni téléphone.`);
   const orphan=missions.filter(m=>!m.assigned_user_id&&['planned','in_progress'].includes(m.status)).length;if(orphan)push('access',`${orphan} chantier(s) actif(s) sans responsable.`);
   if(inventory.some(i=>i.quantity<i.minimum_quantity))push('stock','Des articles sont sous le stock minimum.');
   if(!rows.length)push('ok','Aucun risque critique détecté par le contrôle local.');
   setSecurityEvents(current=>[...rows,...current].slice(0,200));return rows;
 },[devices,user,backups.length,invoices,clients,missions,inventory]);
 useEffect(()=>{
   const critical=invoices.filter(i=>i.status==='overdue').length;
   if(critical && !notices.some(n=>n.title==='Factures en retard'&&!n.read)) addNotice({level:'critical',title:'Factures en retard',detail:`${critical} facture(s) nécessitent une action.`,route:'/invoices'});
   const accepted=quotes.filter(q=>q.status==='accepted').length;
   if(accepted && !notices.some(n=>n.title==='Devis acceptés'&&!n.read)) addNotice({level:'warning',title:'Devis acceptés',detail:`${accepted} devis accepté(s) à vérifier/facturer.`,route:'/quotes'});
 },[invoices,quotes,notices,addNotice]);
 const value=useMemo<Value>(()=>({devices,notices,backups,securityEvents,role,permissions:PERMISSIONS[role]??PERMISSIONS.employee,can:p=>(PERMISSIONS[role]??PERMISSIONS.employee).includes(p),unread:notices.filter(n=>!n.read).length,lastBackupAt:backups[0]?.createdAt??null,
  registerCurrentDevice,toggleDeviceTrust:id=>setDevices(r=>r.map(x=>x.id===id?{...x,trusted:!x.trusted}:x)),revokeDevice:id=>setDevices(r=>r.map(x=>x.id===id?{...x,revoked:true,trusted:false}:x)),addNotice,markNoticeRead:id=>setNotices(r=>r.map(x=>x.id===id?{...x,read:true}:x)),markAllRead:()=>setNotices(r=>r.map(x=>({...x,read:true}))),createBackup,restoreBackup,deleteBackup:id=>setBackups(r=>r.filter(x=>x.id!==id)),runSecurityAudit
 }),[devices,notices,backups,securityEvents,role,registerCurrentDevice,addNotice,createBackup,restoreBackup,runSecurityAudit]);
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useV16Platform(){const value=useContext(Ctx);if(!value)throw new Error('useV16Platform must be used inside V16PlatformProvider');return value}
