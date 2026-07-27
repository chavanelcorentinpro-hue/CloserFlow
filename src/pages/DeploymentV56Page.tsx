import { Copy, Globe2, Link2, Server, ShieldCheck, Smartphone } from 'lucide-react';
import { publicShareUrl, PUBLIC_API_URL, PUBLIC_SITE_URL } from '../lib/publicWebV56';

export function DeploymentV56Page(){
 const share=publicShareUrl('/welcome');
 const copy=()=>navigator.clipboard.writeText(share);
 return <>
  <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 56 · PUBLIC WEB</p><h1>Mise en ligne</h1><p>Vérifie l’URL publique, l’API et le lien à partager pour lancer l’acquisition en ligne.</p></div><Globe2/></div>
  <section className="v56-grid">
   <article><Globe2/><div><span>Site public</span><strong>{PUBLIC_SITE_URL}</strong></div></article>
   <article><Server/><div><span>API configurée</span><strong>{PUBLIC_API_URL||'Origine / configuration locale'}</strong></div></article>
   <article><Link2/><div><span>Landing page</span><strong>{share}</strong></div><button className="ghost" onClick={copy}><Copy/>Copier</button></article>
   <article><Smartphone/><div><span>PWA</span><strong>Installable depuis le navigateur</strong></div></article>
  </section>
  <section className="panel"><ShieldCheck/><h2>Prêt pour une URL publique</h2><p>Le frontend et l’API sont séparables. Les écrans métier restent derrière l’authentification et les pages publiques servent à l’acquisition/inscription.</p></section>
 </>;
}
