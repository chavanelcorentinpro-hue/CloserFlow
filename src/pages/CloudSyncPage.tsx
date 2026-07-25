import { useEffect, useMemo, useState } from 'react';
import { Cloud, CloudDownload, CloudUpload, Copy, RefreshCw, Server, ShieldCheck, Smartphone } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { checkCloud, getSyncHistory, pullBackup, pushBackup, readCloudConfig, readSyncMeta, saveCloudConfig, SyncConflictError, type CloudConfig, type SyncHistoryItem } from '../lib/cloud';

export function CloudSyncPage() {
  const { exportBackup, importBackup } = useAppData();
  const { token, user, apiUrl } = useAuth();
  const [config, setConfig] = useState<CloudConfig>(() => readCloudConfig());
  const [meta, setMeta] = useState(() => readSyncMeta());
  const [busy, setBusy] = useState<'test' | 'push' | 'pull' | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [conflict, setConflict] = useState<SyncConflictError['current'] | null>(null);
  useEffect(() => { getSyncHistory(config).then(r => setHistory(r.history)).catch(() => undefined); }, [config.apiUrl, config.apiToken, config.workspaceId]);
  const lastSync = useMemo(() => meta.lastSyncAt ? new Date(meta.lastSyncAt).toLocaleString('fr-FR') : 'Jamais', [meta.lastSyncAt]);
  const useAccountSession = () => {
    if (!user || !token) return;
    const next = { ...config, apiUrl, apiToken: token, workspaceId: user.workspaceId };
    setConfig(next); saveCloudConfig(next);
    setMessage({ type: 'ok', text: 'Session du compte appliquée à la synchronisation.' });
  };

  const update = (field: keyof CloudConfig, value: string) => {
    const next = { ...config, [field]: value };
    setConfig(next);
    saveCloudConfig(next);
  };

  const run = async (kind: 'test' | 'push' | 'pull') => {
    setBusy(kind); setMessage(null);
    try {
      if (kind === 'test') {
        const health = await checkCloud(config);
        setMessage({ type: 'ok', text: `${health.service} répond correctement.` });
      } else if (kind === 'push') {
        const result = await pushBackup(config, exportBackup());
        setConflict(null);
        getSyncHistory(config).then(r => setHistory(r.history)).catch(() => undefined);
        setMeta(readSyncMeta());
        setMessage({ type: 'ok', text: `Données envoyées. Révision cloud ${result.revision}.` });
      } else {
        const result = await pullBackup(config);
        if (!confirm(`Remplacer les données locales par la révision cloud ${result.revision} ?`)) return;
        importBackup(result.payload);
        setMeta(readSyncMeta());
        setMessage({ type: 'ok', text: `Révision ${result.revision} téléchargée et appliquée.` });
      }
    } catch (error) {
      if (error instanceof SyncConflictError) setConflict(error.current);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Échec de la synchronisation.' });
    } finally { setBusy(null); }
  };

  return <>
    <div className="page-title cloud-title"><div><p className="eyebrow">CLOUD ALPHA</p><h1>Synchronisation</h1><p>Connecte cette installation à l’API CloserFlow de développement.</p></div><Cloud/></div>
    <section className="cloud-status-grid">
      <article><Smartphone/><div><span>Appareil</span><strong>{config.deviceId.slice(0, 18)}…</strong></div><button className="icon-button" onClick={() => navigator.clipboard.writeText(config.deviceId)} title="Copier"><Copy/></button></article>
      <article><RefreshCw/><div><span>Dernière synchronisation</span><strong>{lastSync}</strong><small>Révision {meta.revision}</small></div></article>
      <article><ShieldCheck/><div><span>Mode actuel</span><strong>API de développement</strong><small>Jeton Bearer requis</small></div></article>
    </section>

    <section className="form-card cloud-config">
      <div className="section-heading"><div><p className="eyebrow">CONNEXION</p><h2>Serveur</h2></div><Server/></div>
      <label>URL de l’API<input value={config.apiUrl} onChange={e => update('apiUrl', e.target.value)} placeholder="http://localhost:8787"/></label>
      <label>Espace de travail<input value={config.workspaceId} onChange={e => update('workspaceId', e.target.value)} placeholder="default"/></label>
      <label>Jeton API<input type="password" value={config.apiToken} onChange={e => update('apiToken', e.target.value)} placeholder="dev-token"/></label>
      <div className="cloud-config-actions"><button className="ghost" type="button" onClick={useAccountSession}><ShieldCheck/>Utiliser mon compte</button><button className="ghost" disabled={!!busy} onClick={() => run('test')}><Server/>{busy === 'test' ? 'Test en cours…' : 'Tester la connexion'}</button></div>
      {message && <p className={`cloud-message ${message.type}`}>{message.text}</p>}
    </section>

    <section className="cloud-actions">
      <button onClick={() => run('push')} disabled={!!busy}><CloudUpload/><div><strong>{busy === 'push' ? 'Envoi en cours…' : 'Envoyer vers le cloud'}</strong><small>Crée une nouvelle révision du dossier complet.</small></div></button>
      <button onClick={() => run('pull')} disabled={!!busy}><CloudDownload/><div><strong>{busy === 'pull' ? 'Téléchargement…' : 'Récupérer du cloud'}</strong><small>Remplace les données locales après confirmation.</small></div></button>
    </section>


    {conflict && <section className="form-card sync-conflict"><div><p className="eyebrow">CONFLIT DÉTECTÉ</p><h2>Une autre installation a envoyé des données</h2><p>Révision cloud {conflict.revision}, mise à jour le {new Date(conflict.updatedAt).toLocaleString('fr-FR')}.</p></div><div className="cloud-config-actions"><button className="ghost" onClick={() => run('pull')}><CloudDownload/>Récupérer le cloud</button><button onClick={async()=>{if(!confirm('Écraser la version cloud avec les données de cet appareil ?'))return;setBusy('push');try{const result=await pushBackup(config,exportBackup(),true);setMeta(readSyncMeta());setConflict(null);setMessage({type:'ok',text:`Conflit résolu. Révision ${result.revision} envoyée.`})}catch(e){setMessage({type:'error',text:e instanceof Error?e.message:'Échec.'})}finally{setBusy(null)}}}><CloudUpload/>Forcer l’envoi local</button></div></section>}

    <section className="form-card sync-history"><div className="section-heading"><div><p className="eyebrow">HISTORIQUE</p><h2>Révisions précédentes</h2></div><RefreshCw/></div>{history.length===0?<p>Aucune révision précédente.</p>:<div className="sync-history-list">{history.map(item=><article key={`${item.revision}-${item.updatedAt}`}><div><strong>Révision {item.revision}</strong><small>{new Date(item.updatedAt).toLocaleString('fr-FR')}</small></div><span>{item.deviceId.slice(0,12)}…</span><button className="ghost" onClick={()=>{if(confirm(`Restaurer la révision ${item.revision} sur cet appareil ?`)){importBackup(item.payload);setMessage({type:'ok',text:`Révision ${item.revision} restaurée localement.`})}}}>Restaurer</button></article>)}</div>}</section>

    <aside className="cloud-warning"><strong>Fondation SaaS, pas encore production.</strong><p>Cette alpha fournit un protocole de synchronisation réel et un serveur local de référence. Le chiffrement au repos, la gestion de comptes distants, les conflits avancés et l’hébergement sécurisé restent à mettre en place avant une utilisation commerciale.</p></aside>
  </>;
}
