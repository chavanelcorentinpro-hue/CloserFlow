import { useEffect, useMemo, useState } from 'react';
import { Braces, Check, Clipboard, ExternalLink, KeyRound, PlugZap, RefreshCw, ShieldCheck, Trash2, Webhook } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type ApiKeyItem={id:string;name:string;prefix:string;scopes:string[];createdAt:string;lastUsedAt:string|null;revokedAt:string|null};
type WebhookItem={id:string;url:string;events:string[];active:boolean;createdAt:string;lastDeliveryAt:string|null};
type LogItem={id:string;createdAt:string;type:string;status:number;detail:string;keyPrefix?:string};
const scopeOptions=[['workspace:read','Dossier synchronisé'],['clients:read','Clients'],['missions:read','Missions']] as const;
const eventOptions=['quote.created','invoice.paid','mission.completed','client.created'];

export function ApiConnectorsPage(){
 const {apiUrl,token,user}=useAuth();
 const [keys,setKeys]=useState<ApiKeyItem[]>([]),[webhooks,setWebhooks]=useState<WebhookItem[]>([]),[logs,setLogs]=useState<LogItem[]>([]);
 const [name,setName]=useState('Connexion externe'),[scopes,setScopes]=useState<string[]>(['clients:read','missions:read']);
 const [url,setUrl]=useState(''),[events,setEvents]=useState<string[]>(['mission.completed']);
 const [secret,setSecret]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const headers=useMemo(()=>({Authorization:`Bearer ${token}`,'Content-Type':'application/json'}),[token]);
 const request=async(path:string,options:RequestInit={})=>{const r=await fetch(`${apiUrl}${path}`,{...options,headers:{...headers,...(options.headers||{})}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'Erreur API');return body};
 const load=async()=>{setBusy(true);setMessage('');try{const [a,b,c]=await Promise.all([request('/api/integrations/keys'),request('/api/integrations/webhooks'),request('/api/integrations/logs')]);setKeys(a.keys);setWebhooks(b.webhooks);setLogs(c.logs)}catch(e){setMessage(e instanceof Error?e.message:'Échec du chargement')}finally{setBusy(false)}};
 useEffect(()=>{load()},[]);// eslint-disable-line react-hooks/exhaustive-deps
 const createKey=async()=>{try{const body=await request('/api/integrations/keys',{method:'POST',body:JSON.stringify({name,scopes})});setSecret(body.secret);setKeys(v=>[body.key,...v]);setMessage('Clé créée. Copiez-la maintenant : elle ne sera plus affichée ensuite.')}catch(e){setMessage(e instanceof Error?e.message:'Erreur')}};
 const revokeKey=async(id:string)=>{if(!confirm('Révoquer définitivement cette clé API ?'))return;await request(`/api/integrations/keys/${id}`,{method:'DELETE'});load()};
 const createWebhook=async()=>{try{const body=await request('/api/integrations/webhooks',{method:'POST',body:JSON.stringify({url,events})});setWebhooks(v=>[body.webhook,...v]);setUrl('');setMessage('Webhook enregistré.')}catch(e){setMessage(e instanceof Error?e.message:'Erreur')}};
 const deleteWebhook=async(id:string)=>{await request(`/api/integrations/webhooks/${id}`,{method:'DELETE'});setWebhooks(v=>v.filter(x=>x.id!==id))};
 const copy=(value:string)=>navigator.clipboard.writeText(value).then(()=>setMessage('Copié dans le presse-papiers.'));
 return <div className="integrations-page">
  <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 10.1</p><h1>API publique & connecteurs</h1><p>Connectez CloserFlow à votre comptabilité, vos automatisations et vos outils métier.</p></div><PlugZap/></div>
  <section className="integration-kpis"><article><KeyRound/><div><strong>{keys.filter(k=>!k.revokedAt).length}</strong><span>clés actives</span></div></article><article><Webhook/><div><strong>{webhooks.length}</strong><span>webhooks</span></div></article><article><Braces/><div><strong>OpenAPI 3.0</strong><span>documentation</span></div></article><article><ShieldCheck/><div><strong>{user?.workspaceId}</strong><span>espace isolé</span></div></article></section>
  {message&&<p className="cloud-message ok">{message}</p>}
  {secret&&<section className="secret-banner"><div><ShieldCheck/><div><strong>Nouvelle clé secrète</strong><small>Elle ne sera affichée qu’une seule fois.</small></div></div><code>{secret}</code><button onClick={()=>copy(secret)}><Clipboard/>Copier</button></section>}
  <div className="integration-grid">
   <section className="form-card"><div className="section-heading"><div><p className="eyebrow">AUTHENTIFICATION</p><h2>Clés API</h2></div><KeyRound/></div><label>Nom de la connexion<input value={name} onChange={e=>setName(e.target.value)}/></label><div className="scope-list">{scopeOptions.map(([value,label])=><label key={value}><input type="checkbox" checked={scopes.includes(value)} onChange={()=>setScopes(s=>s.includes(value)?s.filter(x=>x!==value):[...s,value])}/><span><strong>{label}</strong><small>{value}</small></span></label>)}</div><button onClick={createKey}><KeyRound/>Générer une clé</button><div className="integration-list">{keys.map(k=><article className={k.revokedAt?'disabled':''} key={k.id}><div><strong>{k.name}</strong><code>{k.prefix}…</code><small>{k.scopes.join(' · ')}</small></div><div><small>{k.lastUsedAt?`Utilisée ${new Date(k.lastUsedAt).toLocaleString('fr-FR')}`:'Jamais utilisée'}</small>{!k.revokedAt&&<button className="icon-button danger" onClick={()=>revokeKey(k.id)}><Trash2/></button>}</div></article>)}</div></section>
   <section className="form-card"><div className="section-heading"><div><p className="eyebrow">ÉVÉNEMENTS</p><h2>Webhooks</h2></div><Webhook/></div><label>URL HTTPS<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://exemple.fr/webhooks/closerflow"/></label><div className="scope-list">{eventOptions.map(value=><label key={value}><input type="checkbox" checked={events.includes(value)} onChange={()=>setEvents(s=>s.includes(value)?s.filter(x=>x!==value):[...s,value])}/><span><strong>{value}</strong></span></label>)}</div><button onClick={createWebhook}><Webhook/>Ajouter le webhook</button><div className="integration-list">{webhooks.map(w=><article key={w.id}><div><strong>{w.url}</strong><small>{w.events.join(' · ')}</small></div><button className="icon-button danger" onClick={()=>deleteWebhook(w.id)}><Trash2/></button></article>)}</div></section>
  </div>
  <section className="form-card"><div className="section-heading"><div><p className="eyebrow">DOCUMENTATION</p><h2>Points d’accès publics</h2></div><Braces/></div><div className="endpoint-list">{[['GET','/public/v1/workspace','Dossier synchronisé complet'],['GET','/public/v1/clients','Liste des clients'],['GET','/public/v1/missions','Liste des missions']].map(([method,path,label])=><article key={path}><b>{method}</b><code>{apiUrl}{path}</code><span>{label}</span><button className="icon-button" onClick={()=>copy(`${apiUrl}${path}`)}><Clipboard/></button></article>)}</div><div className="integration-actions"><button className="ghost" onClick={()=>window.open(`${apiUrl}/api/openapi.json`,'_blank')}><ExternalLink/>Ouvrir OpenAPI JSON</button><button className="ghost" onClick={load} disabled={busy}><RefreshCw/>{busy?'Actualisation…':'Actualiser'}</button></div></section>
  <section className="form-card"><div className="section-heading"><div><p className="eyebrow">AUDIT</p><h2>Journal des appels</h2></div><Check/></div><div className="api-log-list">{logs.length===0?<p>Aucun appel enregistré.</p>:logs.map(l=><article key={l.id}><time>{new Date(l.createdAt).toLocaleString('fr-FR')}</time><strong>{l.type}</strong><span>{l.detail}</span><b className={l.status<400?'ok':'error'}>{l.status}</b></article>)}</div></section>
 </div>
}
