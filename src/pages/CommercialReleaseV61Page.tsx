import { BadgeEuro, CheckCircle2, LockKeyhole, Server, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMMERCIAL_RELEASE_V61, productionReadinessV61 } from '../lib/commercialReleaseV61';

export function CommercialReleaseV61Page(){
  const {apiUrl,token}=useAuth();
  const readiness=productionReadinessV61(apiUrl,token);
  return <>
    <div className="page-title">
      <div><p className="eyebrow">CLOSERFLOW 61 · COMMERCIAL RELEASE</p><h1>Préparation à la vente</h1><p>Contrôles essentiels avant d'accepter des abonnements réels.</p></div>
      <BadgeEuro/>
    </div>

    <section className="v61-readiness">
      <article><Server/><div><strong>API de production</strong><span>{readiness.secureApi?'HTTPS configuré':'HTTPS à configurer'}</span></div></article>
      <article><Users/><div><strong>Compte & workspace</strong><span>{readiness.authenticated?'Session serveur active':'Connexion serveur requise'}</span></div></article>
      <article><LockKeyhole/><div><strong>Licence</strong><span>Abonnement et droits contrôlés côté serveur</span></div></article>
      <article><ShieldCheck/><div><strong>Protection commerciale</strong><span>Fonctions sensibles hors du frontend public</span></div></article>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">OFFRES</p><h2>Tarifs configurés</h2></div></div>
      <div className="v61-plans">
        {COMMERCIAL_RELEASE_V61.plans.map(p=><article key={p.id}><strong>{p.label}</strong><b>{p.monthly.toLocaleString('fr-FR',{minimumFractionDigits:2})} € / mois</b><span>{p.description}</span></article>)}
      </div>
    </section>

    <section className="panel">
      <h2>État commercial</h2>
      <p><CheckCircle2/> Le code V61 prépare le parcours commercial, mais un paiement réel ne doit être activé qu'après configuration du backend de production, du prestataire de paiement et des informations légales.</p>
    </section>
  </>;
}
