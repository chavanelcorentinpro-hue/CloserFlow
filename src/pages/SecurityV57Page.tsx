import { useEffect, useState } from 'react';
import { BadgeCheck, LockKeyhole, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchEntitlements, type EntitlementsV57 } from '../lib/entitlementsV57';

export function SecurityV57Page(){
  const {apiUrl,token}=useAuth();
  const [data,setData]=useState<EntitlementsV57|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!token||token==='local-device')return;
    fetchEntitlements(apiUrl,token).then(setData).catch(e=>setError(e instanceof Error?e.message:'Erreur'));
  },[apiUrl,token]);
  return <>
    <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 57 · HARDENING</p><h1>Protection commerciale</h1><p>Les fonctions stratégiques sont liées à l’authentification, au workspace et au statut d’essai/abonnement côté serveur.</p></div><ShieldCheck/></div>
    <section className="v57-security-grid">
      <article><LockKeyhole/><div><strong>Source maps</strong><span>Désactivées en production</span></div><BadgeCheck/></article>
      <article><ShieldCheck/><div><strong>API</strong><span>Rate limit + CORS + headers sécurité</span></div><BadgeCheck/></article>
      <article><ShieldCheck/><div><strong>Secrets</strong><span>Scan automatisé avant build</span></div><BadgeCheck/></article>
      <article><ShieldCheck/><div><strong>Droits premium</strong><span>Vérification côté serveur</span></div>{data?.active?<BadgeCheck/>:<ShieldAlert/>}</article>
    </section>
    {data&&<section className="panel"><h2>Droits actuels · {data.plan.toUpperCase()}</h2><div className="v57-entitlements">{Object.entries(data.entitlements).map(([name,enabled])=><span key={name} className={enabled?'ok':'off'}>{name}: {enabled?'actif':'bloqué'}</span>)}</div>{!data.active&&<p className="form-error">{data.reason||'Abonnement inactif.'}</p>}</section>}
    {error&&<div className="notice"><ShieldAlert/><span>{error}</span></div>}
  </>;
}
