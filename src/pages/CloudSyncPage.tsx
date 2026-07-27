import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeCheck, Cloud, CloudDownload, CloudUpload, Copy, History,
  Laptop2, RefreshCw, Server, ShieldCheck, ShieldQuestion, Smartphone, Trash2, Wifi
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { saveRestorePoint } from '../lib/mobileSafety';
import {
  acceptPulledRevision, checkCloud, getPlatformSummary, getSyncHistory, listDevices,
  peekBackup, pushBackup, readCloudConfig, readDeviceLabel, readSyncMeta, registerDevice,
  revokeDevice, saveCloudConfig, saveDeviceLabel, trustDevice, SyncConflictError,
  type CloudConfig, type DeviceRecord, type PlatformSummary, type SyncHistoryItem
} from '../lib/cloud';

type Busy='test'|'push'|'pull'|'check'|'devices'|null;

export function CloudSyncPage() {
  const { exportBackup, importBackup } = useAppData();
  const { token, user, apiUrl } = useAuth();
  const [config,setConfig]=useState<CloudConfig>(()=>readCloudConfig());
  const [meta,setMeta]=useState(()=>readSyncMeta());
  const [busy,setBusy]=useState<Busy>(null);
  const [message,setMessage]=useState<{type:'ok'|'error'|'info';text:string}|null>(null);
  const [history,setHistory]=useState<SyncHistoryItem[]>([]);
  const [devices,setDevices]=useState<DeviceRecord[]>([]);
  const [summary,setSummary]=useState<PlatformSummary|null>(null);
  const [conflict,setConflict]=useState<SyncConflictError['current']|null>(null);
  const [deviceLabel,setDeviceLabelState]=useState(()=>readDeviceLabel());

  const accountCloud=!!user&&!!token&&token!=='local-device';
  const lastSync=useMemo(()=>meta.lastSyncAt?new Date(meta.lastSyncAt).toLocaleString('fr-FR'):'Jamais',[meta.lastSyncAt]);
  const remoteAhead=meta.remoteRevision!==null&&meta.remoteRevision>meta.revision;

  const refreshHistory=()=>getSyncHistory(config).then(r=>setHistory(r.history)).catch(()=>undefined);
  const refreshAccount=async()=>{
    if(!accountCloud)return;
    setBusy('devices');
    try{
      const [d,s]=await Promise.all([listDevices(config),getPlatformSummary(config)]);
      setDevices(d.devices);
      setSummary(s);
    }catch(error){
      setMessage({type:'error',text:error instanceof Error?error.message:'Impossible de lire les appareils.'});
    }finally{setBusy(null)}
  };

  useEffect(()=>{refreshHistory()},[config.apiUrl,config.apiToken,config.workspaceId]);
  useEffect(()=>{if(accountCloud)refreshAccount()},[config.apiUrl,config.apiToken,config.workspaceId,accountCloud]);

  const update=(field:keyof CloudConfig,value:string)=>{
    const next={...config,[field]:value};
    setConfig(next);saveCloudConfig(next);
  };

  const useAccountSession=async()=>{
    if(!user||!token||token==='local-device'){
      setMessage({type:'error',text:'Connecte un compte serveur pour utiliser la synchronisation multi-appareils.'});
      return;
    }
    const next={...config,apiUrl,apiToken:token,workspaceId:user.workspaceId};
    setConfig(next);saveCloudConfig(next);
    try{
      await registerDevice(next,deviceLabel);
      setMessage({type:'ok',text:'Compte et appareil associés à la synchronisation.'});
      const [d,s]=await Promise.all([listDevices(next),getPlatformSummary(next)]);
      setDevices(d.devices);setSummary(s);
    }catch(error){
      setMessage({type:'error',text:error instanceof Error?error.message:'Association impossible.'});
    }
  };

  const saveLabel=async()=>{
    saveDeviceLabel(deviceLabel);
    if(accountCloud){
      try{await registerDevice(config,deviceLabel);await refreshAccount();setMessage({type:'ok',text:'Nom de l’appareil enregistré.'})}
      catch(error){setMessage({type:'error',text:error instanceof Error?error.message:'Enregistrement impossible.'})}
    }else setMessage({type:'info',text:'Nom enregistré localement. Associe ensuite un compte serveur.'});
  };

  const test=async()=>{
    setBusy('test');setMessage(null);
    try{
      const health=await checkCloud(config);
      setMessage({type:'ok',text:`${health.service} ${health.version?`v${health.version} `:''}répond correctement.`});
    }catch(error){setMessage({type:'error',text:error instanceof Error?error.message:'Serveur inaccessible.'})}
    finally{setBusy(null)}
  };

  const checkRemote=async()=>{
    setBusy('check');setMessage(null);
    try{
      const remote=await peekBackup(config);
      setMeta(readSyncMeta());
      if(remote.revision>readSyncMeta().revision)setMessage({type:'info',text:`Révision ${remote.revision} disponible dans le cloud. Tes données locales ne sont pas remplacées.`});
      else if(remote.revision===readSyncMeta().revision)setMessage({type:'ok',text:`Local et cloud sont alignés sur la révision ${remote.revision}.`});
      else setMessage({type:'info',text:`Le cloud est en révision ${remote.revision}.`});
    }catch(error){setMessage({type:'error',text:error instanceof Error?error.message:'Vérification impossible.'})}
    finally{setBusy(null)}
  };

  const push=async(force=false)=>{
    setBusy('push');setMessage(null);
    try{
      if(accountCloud)await registerDevice(config,deviceLabel);
      const result=await pushBackup(config,exportBackup(),force);
      setConflict(null);setMeta(readSyncMeta());refreshHistory();if(accountCloud)refreshAccount();
      setMessage({type:'ok',text:`Synchronisation envoyée. Révision cloud ${result.revision}.`});
    }catch(error){
      if(error instanceof SyncConflictError)setConflict(error.current);
      setMessage({type:'error',text:error instanceof Error?error.message:'Échec de l’envoi.'});
    }finally{setBusy(null)}
  };

  const pull=async()=>{
    setBusy('pull');setMessage(null);
    try{
      const result=await peekBackup(config);
      if(!confirm(`Installer la révision cloud ${result.revision} sur cet appareil ? Une sauvegarde locale sera créée avant remplacement.`))return;
      saveRestorePoint('before-restore');
      importBackup(result.payload);
      acceptPulledRevision(result);
      setMeta(readSyncMeta());setConflict(null);
      setMessage({type:'ok',text:`Révision ${result.revision} installée. Un point de restauration local a été créé.`});
    }catch(error){
      setMessage({type:'error',text:error instanceof Error?error.message:'Échec du téléchargement.'});
    }finally{setBusy(null)}
  };

  const restoreHistory=(item:SyncHistoryItem)=>{
    if(!confirm(`Restaurer localement la révision ${item.revision} ?`))return;
    saveRestorePoint('before-restore');
    importBackup(item.payload);
    setMessage({type:'ok',text:`Révision historique ${item.revision} restaurée localement. Le cloud n’a pas été modifié.`});
  };

  const setTrust=async(id:string)=>{
    try{await trustDevice(config,id);await refreshAccount();setMessage({type:'ok',text:'Appareil marqué comme fiable.'})}
    catch(error){setMessage({type:'error',text:error instanceof Error?error.message:'Action impossible.'})}
  };
  const revoke=async(id:string)=>{
    if(!confirm('Révoquer cet appareil de l’espace de travail ?'))return;
    try{await revokeDevice(config,id);await refreshAccount();setMessage({type:'ok',text:'Appareil révoqué.'})}
    catch(error){setMessage({type:'error',text:error instanceof Error?error.message:'Révocation impossible.'})}
  };

  return <>
    <div className="page-title cloud-title">
      <div><p className="eyebrow">CLOSERFLOW 34 · MULTI-DEVICE</p><h1>Cloud & synchronisation</h1><p>Synchronise plusieurs appareils avec révisions, conflits, historique et sauvegarde de sécurité avant restauration.</p></div>
      <Cloud/>
    </div>

    <section className="v34-status">
      <article><Smartphone/><div><span>Appareil</span><strong>{deviceLabel}</strong><small>{config.deviceId.slice(0,18)}…</small></div></article>
      <article><RefreshCw/><div><span>Dernière synchro</span><strong>{lastSync}</strong><small>Local : révision {meta.revision}</small></div></article>
      <article className={remoteAhead?'warning':''}><Cloud/><div><span>Cloud connu</span><strong>{meta.remoteRevision===null?'Non vérifié':`Révision ${meta.remoteRevision}`}</strong><small>{remoteAhead?'Une version distante est plus récente':'Aucun retard détecté'}</small></div></article>
      <article><Wifi/><div><span>Mode</span><strong>{accountCloud?'Compte serveur':'Configuration manuelle'}</strong><small>{summary?`${summary.devices} appareil(s) actif(s)`:'Synchronisation explicite'}</small></div></article>
    </section>

    {message&&<div className={`notice v34-message ${message.type}`}><BadgeCheck/><span>{message.text}</span></div>}
    {remoteAhead&&<div className="notice v34-warning"><AlertTriangle/><span><strong>Cloud plus récent.</strong> Vérifie ou récupère les données avant d’envoyer depuis cet appareil.</span></div>}

    <section className="v34-grid">
      <div className="form-card">
        <div className="section-heading"><div><p className="eyebrow">APPAREIL</p><h2>Identité de cette installation</h2></div><Laptop2/></div>
        <label>Nom de l’appareil<input value={deviceLabel} onChange={e=>setDeviceLabelState(e.target.value)} placeholder="Téléphone chantier"/></label>
        <div className="cloud-config-actions">
          <button className="ghost" onClick={saveLabel}>Enregistrer le nom</button>
          <button className="icon-button" onClick={()=>navigator.clipboard.writeText(config.deviceId)} title="Copier l’identifiant"><Copy/></button>
        </div>
      </div>

      <div className="form-card cloud-config">
        <div className="section-heading"><div><p className="eyebrow">SERVEUR</p><h2>Connexion</h2></div><Server/></div>
        <label>URL de l’API<input value={config.apiUrl} onChange={e=>update('apiUrl',e.target.value)} placeholder="https://api.exemple.fr"/></label>
        <label>Espace de travail<input value={config.workspaceId} onChange={e=>update('workspaceId',e.target.value)} placeholder="entreprise"/></label>
        <label>Jeton API<input type="password" value={config.apiToken} onChange={e=>update('apiToken',e.target.value)} placeholder="Jeton Bearer"/></label>
        <div className="cloud-config-actions">
          <button className="ghost" onClick={useAccountSession}><ShieldCheck/>Utiliser mon compte</button>
          <button className="ghost" disabled={!!busy} onClick={test}><Server/>{busy==='test'?'Test…':'Tester'}</button>
        </div>
      </div>
    </section>

    <section className="cloud-actions v34-actions">
      <button onClick={checkRemote} disabled={!!busy}><RefreshCw/><div><strong>{busy==='check'?'Vérification…':'Vérifier le cloud'}</strong><small>Compare les révisions sans modifier les données locales.</small></div></button>
      <button onClick={()=>push(false)} disabled={!!busy||remoteAhead}><CloudUpload/><div><strong>{busy==='push'?'Envoi…':'Envoyer cet appareil'}</strong><small>Crée une nouvelle révision si le cloud n’est pas plus récent.</small></div></button>
      <button onClick={pull} disabled={!!busy}><CloudDownload/><div><strong>{busy==='pull'?'Téléchargement…':'Récupérer le cloud'}</strong><small>Crée d’abord un point de restauration local.</small></div></button>
    </section>

    {conflict&&<section className="form-card sync-conflict">
      <div><p className="eyebrow">CONFLIT</p><h2>Une autre installation a modifié le cloud</h2><p>Révision {conflict.revision}, mise à jour le {new Date(conflict.updatedAt).toLocaleString('fr-FR')} depuis {conflict.deviceId.slice(0,18)}…</p></div>
      <div className="cloud-config-actions">
        <button className="ghost" onClick={pull}><CloudDownload/>Récupérer d’abord</button>
        <button onClick={()=>{if(confirm('Écraser la version cloud avec cet appareil ? Cette action doit rester exceptionnelle.'))push(true)}}><CloudUpload/>Forcer l’envoi local</button>
      </div>
    </section>}

    {accountCloud&&<section className="form-card">
      <div className="section-heading"><div><p className="eyebrow">MULTI-APPAREILS</p><h2>Appareils du compte</h2></div><Smartphone/></div>
      <div className="v34-device-list">
        {devices.length===0?<p>Aucun appareil enregistré.</p>:devices.map(d=><article key={d.id} className={d.revokedAt?'revoked':''}>
          <div><strong>{d.label}</strong><small>{d.platform} · vu {new Date(d.lastSeenAt).toLocaleString('fr-FR')}</small></div>
          <span>{d.trusted?'Fiable':'À valider'}</span>
          {!d.revokedAt&&user?.role!=='employee'&&!d.trusted&&<button className="ghost" onClick={()=>setTrust(d.id)}><ShieldCheck/>Fiabiliser</button>}
          {!d.revokedAt&&user?.role==='admin'&&d.deviceId!==config.deviceId&&<button className="ghost danger" onClick={()=>revoke(d.id)}><Trash2/>Révoquer</button>}
        </article>)}
      </div>
      {summary&&<p className="muted-copy">Workspace {summary.workspaceId} · révision serveur {summary.revision} · dernière mise à jour {summary.updatedAt?new Date(summary.updatedAt).toLocaleString('fr-FR'):'aucune'}.</p>}
    </section>}

    <section className="form-card sync-history">
      <div className="section-heading"><div><p className="eyebrow">HISTORIQUE</p><h2>Révisions précédentes</h2></div><History/></div>
      {history.length===0?<p>Aucune révision précédente.</p>:<div className="sync-history-list">{history.map(item=><article key={`${item.revision}-${item.updatedAt}`}>
        <div><strong>Révision {item.revision}</strong><small>{new Date(item.updatedAt).toLocaleString('fr-FR')}</small></div>
        <span>{item.deviceId.slice(0,12)}…</span>
        <button className="ghost" onClick={()=>restoreHistory(item)}>Restaurer localement</button>
      </article>)}</div>}
    </section>

    <aside className="cloud-warning">
      <ShieldQuestion/>
      <div><strong>Synchronisation prudente.</strong><p>V34 ne fusionne pas silencieusement deux jeux de données différents. Un conflit bloque l’envoi afin d’éviter d’écraser le travail d’un autre appareil.</p></div>
    </aside>
  </>;
}
