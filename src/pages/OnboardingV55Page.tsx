import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck, Building2, CheckCircle2, FilePlus2, Rocket,
  Sparkles, UserPlus, UsersRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { daysLeft, fetchSubscription, type SubscriptionV55 } from '../lib/billingV55';

const DONE_KEY='closerflow.v55.onboarding.done';

export function OnboardingV55Page(){
  const {apiUrl,token,user}=useAuth();
  const data=useAppData() as any;
  const [subscription,setSubscription]=useState<SubscriptionV55|null>(null);
  const [loading,setLoading]=useState(token!=='local-device');

  useEffect(()=>{
    if(!token||token==='local-device'){setLoading(false);return}
    fetchSubscription(apiUrl,token).then(r=>setSubscription(r.subscription)).catch(()=>undefined).finally(()=>setLoading(false));
  },[apiUrl,token]);

  const companyOk=!!(data.company?.name&&data.company?.email);
  const clientOk=(data.clients||[]).length>0;
  const quoteOk=(data.quotes||[]).length>0;
  const complete=[companyOk,clientOk,quoteOk].filter(Boolean).length;
  const percent=Math.round(complete/3*100);

  const finish=()=>localStorage.setItem(DONE_KEY,'1');

  return <>
    <div className="page-title">
      <div><p className="eyebrow">CLOSERFLOW 55 · PREMIERS PAS</p><h1>Bienvenue {user?.displayName}</h1><p>Trois étapes suffisent pour rendre CloserFlow opérationnel.</p></div>
      <Rocket/>
    </div>

    <section className="v55-welcome">
      <div>
        <small>Progression</small><strong>{percent} %</strong>
        <div className="v55-progress"><i style={{width:`${percent}%`}}/></div>
      </div>
      {loading?<span>Lecture de l’essai…</span>:subscription?
        <div><small>Plan d’essai</small><strong>{subscription.plan.toUpperCase()}</strong><span>{daysLeft(subscription)} jour(s) restant(s)</span></div>:
        <div><small>Mode</small><strong>Local</strong></div>}
    </section>

    <section className="v55-steps">
      <article className={companyOk?'done':''}><Building2/><div><strong>1. Configurer l’entreprise</strong><p>Identité, e-mail, coordonnées et paramètres des documents.</p></div>{companyOk?<CheckCircle2/>:<Link to="/settings">Configurer</Link>}</article>
      <article className={clientOk?'done':''}><UserPlus/><div><strong>2. Ajouter un premier client</strong><p>Crée une fiche client réelle ou de test.</p></div>{clientOk?<CheckCircle2/>:<Link to="/clients">Ajouter</Link>}</article>
      <article className={quoteOk?'done':''}><FilePlus2/><div><strong>3. Créer un premier devis</strong><p>Teste le parcours complet jusqu’au devis.</p></div>{quoteOk?<CheckCircle2/>:<Link to="/quotes">Créer</Link>}</article>
    </section>

    <section className="v55-next">
      <div><Sparkles/><strong>Tu peux utiliser tout CloserFlow pendant l’essai.</strong><p>Le plan choisi définit déjà la capacité du workspace. Les paiements restent désactivés pendant le pré-lancement.</p></div>
      <Link to="/" className="primary-button" onClick={finish}><BadgeCheck/>Entrer dans CloserFlow</Link>
    </section>
  </>;
}
