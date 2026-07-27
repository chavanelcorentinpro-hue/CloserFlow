import { useMemo } from 'react';
import { BarChart3, MousePointerClick, Sparkles, UsersRound } from 'lucide-react';
import { loadFunnel } from '../lib/commercialV54';

export function CommercialAnalyticsV54Page(){
 const rows=loadFunnel();
 const stats=useMemo(()=>({
   visits:rows.filter(r=>r.type==='landing_view').length,
   pricing:rows.filter(r=>r.type==='pricing_view').length,
   signup:rows.filter(r=>r.type==='signup_click').length,
   trial:rows.filter(r=>r.type==='trial_click').length
 }),[rows]);
 const conv=stats.visits?stats.signup/stats.visits*100:0;
 return <>
  <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 55 · COMMERCIAL</p><h1>Conversion & lancement</h1><p>Suivi local des premières interactions commerciales.</p></div><BarChart3/></div>
  <section className="v54-kpis">
   <article><UsersRound/><span>Visites landing</span><strong>{stats.visits}</strong></article>
   <article><MousePointerClick/><span>Vues tarifs</span><strong>{stats.pricing}</strong></article>
   <article><Sparkles/><span>Clics inscription</span><strong>{stats.signup}</strong></article>
   <article><BarChart3/><span>Conversion inscription</span><strong>{conv.toFixed(1)} %</strong></article>
  </section>
  <section className="panel"><h2>Événements récents</h2><div className="stack">{rows.slice(0,50).map(r=><article key={r.id}><strong>{r.type}</strong><small>{new Date(r.createdAt).toLocaleString('fr-FR')} · {r.plan||'—'} · {r.source||'direct'}</small></article>)}</div></section>
 </>;
}
