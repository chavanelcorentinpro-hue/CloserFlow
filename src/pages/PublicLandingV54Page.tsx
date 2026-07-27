import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeEuro, BriefcaseBusiness, Check, Cloud, FileText,
  Gauge, Languages, PackageCheck, ShieldCheck, Sparkles, UsersRound
} from 'lucide-react';
import { PublicSeoV56 } from '../components/PublicSeoV56';
import { COMMERCIAL_CONFIG, featureMatrix, trackFunnel, type PlanId } from '../lib/commercialV54';

const money=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});

export function PublicLandingV54Page(){
  useEffect(()=>trackFunnel('landing_view'),[]);
  const plans=Object.values(COMMERCIAL_CONFIG.plans);

  const choose=(id:PlanId)=>{trackFunnel('plan_select',id);trackFunnel('trial_click',id)};

  return <div className="v54-public"><PublicSeoV56/>
    <header className="v54-nav">
      <strong>CloserFlow</strong>
      <nav><a href="#features">Fonctions</a><a href="#pricing">Tarifs</a><a href="#faq">FAQ</a></nav>
      <Link to="/login" className="secondary-button">Se connecter</Link>
    </header>

    <main>
      <section className="v54-hero">
        <div>
          <p className="eyebrow">LOGICIEL DE GESTION POUR ARTISANS</p>
          <h1>Devis, chantiers, factures, stock et rentabilité dans une seule application.</h1>
          <p>CloserFlow automatise l’administratif et te montre ce qui rapporte vraiment, sans t’obliger à jongler entre plusieurs outils.</p>
          <div className="action-row">
            <Link to="/signup-v55?plan=solo" className="primary-button" onClick={()=>trackFunnel('signup_click')}><Sparkles/>Essayer gratuitement {COMMERCIAL_CONFIG.trialDays} jours</Link>
            <a href="#pricing" className="secondary-button">Voir les tarifs</a>
          </div>
          <small>Aucune carte bancaire demandée pendant l’essai.</small>
        </div>
        <div className="v54-hero-card">
          <Gauge/>
          <strong>Ton entreprise en un coup d’œil</strong>
          <span>CA · marge · impayés · planning · stock · équipe</span>
        </div>
      </section>

      <section id="features" className="v54-features">
        {[
          [FileText,'Devis & factures','Documents modifiables, modèles et IA de rédaction.'],
          [BriefcaseBusiness,'Chantiers','Planning, temps passé, coûts et avancement.'],
          [PackageCheck,'Stock intelligent','Entrées fournisseur, sorties client et prix réels.'],
          [BadgeEuro,'Prix réalistes','Coûts matière, marge et historique fournisseur.'],
          [Cloud,'Cloud multi-appareils','Synchronisation, sauvegardes et conflits maîtrisés.'],
          [UsersRound,'Équipe','Rôles, validations et journal des décisions.'],
          [Sparkles,'Assistant IA','Prépare devis, messages, analyses et recommandations.'],
          [ShieldCheck,'Données protégées','Sauvegardes, restauration et contrôles d’intégrité.'],
        ].map(([Icon,title,desc]:any)=><article key={title}><Icon/><strong>{title}</strong><p>{desc}</p></article>)}
      </section>

      <section id="pricing" className="v54-pricing" onMouseEnter={()=>trackFunnel('pricing_view')}>
        <div className="section-heading"><div><p className="eyebrow">TARIFS</p><h2>Commence petit, évolue quand tu veux</h2></div><BadgeEuro/></div>
        <div className="v54-plan-grid">
          {plans.map(plan=><article key={plan.id} className={plan.id==='team'?'popular':''}>
            {plan.id==='team'&&<em>Le plus choisi</em>}
            <h3>{plan.name}</h3><p>{plan.tagline}</p>
            <strong>{money.format(plan.monthly)}<small>/mois</small></strong>
            <span>{plan.users} utilisateur{plan.users>1?'s':''}</span>
            <Link to={`/signup-v55?plan=${plan.id}`} className="primary-button" onClick={()=>choose(plan.id)}>Essayer {COMMERCIAL_CONFIG.trialDays} jours<ArrowRight/></Link>
          </article>)}
        </div>

        <div className="v54-table">
          <div className="v54-row head"><span>Fonction</span><b>Solo</b><b>Équipe</b><b>Pro</b></div>
          {featureMatrix.map(([label,a,b,c])=><div className="v54-row" key={label}>
            <span>{label}</span><b>{a?<Check/>:'—'}</b><b>{b?<Check/>:'—'}</b><b>{c?<Check/>:'—'}</b>
          </div>)}
        </div>
      </section>

      <section className="v54-global">
        <Languages/><div><strong>Pensé pour vendre partout</strong><p>Architecture multilingue conservée pour français, anglais, espagnol, allemand, italien, portugais et néerlandais.</p></div>
      </section>

      <section id="faq" className="v54-faq">
        <h2>Questions fréquentes</h2>
        <details><summary>Est-ce que je peux modifier un devis prérempli ?</summary><p>Oui. Les lignes, quantités, prix, TVA et descriptions restent modifiables avant validation.</p></details>
        <details><summary>Le stock peut-il être mis à jour depuis une facture fournisseur ?</summary><p>Oui. CloserFlow rapproche les lignes, propose la réception et mémorise les prix fournisseur.</p></details>
        <details><summary>Les prix des devis sont-ils réalistes ?</summary><p>Le moteur utilise les coûts réels, l’historique entreprise, le temps et la marge. La validation finale reste à l’entreprise.</p></details>
      </section>
    </main>
  </div>;
}
