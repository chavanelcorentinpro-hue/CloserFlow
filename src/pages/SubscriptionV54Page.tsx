import { useEffect, useState } from 'react';
import { BadgeCheck, CreditCard, LockKeyhole, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMMERCIAL_CONFIG, type PlanId } from '../lib/commercialV54';
import { changeTrialPlan, daysLeft, fetchSubscription, type SubscriptionV55 } from '../lib/billingV55';

const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});

export function SubscriptionV54Page(){
  const {apiUrl,token,user}=useAuth();
  const [subscription,setSubscription]=useState<SubscriptionV55|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [cycle,setCycle]=useState<'monthly'|'yearly'>('monthly');

  const load=async()=>{
    if(!token||token==='local-device')return;
    try{const result=await fetchSubscription(apiUrl,token);setSubscription(result.subscription)}
    catch(err){setError(err instanceof Error?err.message:'Statut indisponible.')}
  };
  useEffect(()=>{void load()},[apiUrl,token]);

  const choose=async(plan:PlanId)=>{
    if(user?.role!=='admin')return;
    setBusy(true);setError('');
    try{const result=await changeTrialPlan(apiUrl,token,plan);setSubscription(result.subscription)}
    catch(err){setError(err instanceof Error?err.message:'Changement impossible.')}
    finally{setBusy(false)}
  };

  const active=subscription?.plan||'solo';

  return <>
    <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 55 · ESSAI & PLAN</p><h1>Abonnement</h1><p>Le plan sélectionné est maintenant enregistré côté serveur pour le workspace.</p></div><CreditCard/></div>

    {subscription&&<section className="v55-sub-status">
      <div><small>Statut</small><strong>{subscription.status==='trial'?'Essai gratuit':subscription.status}</strong></div>
      <div><small>Plan</small><strong>{active.toUpperCase()}</strong></div>
      <div><small>Essai restant</small><strong>{daysLeft(subscription)} jours</strong></div>
      <div><small>Utilisateurs inclus</small><strong>{subscription.limits.users}</strong></div>
    </section>}

    <section className="v54-sub">
      <div className="v54-cycle"><button className={cycle==='monthly'?'active':''} onClick={()=>setCycle('monthly')}>Mensuel</button><button className={cycle==='yearly'?'active':''} onClick={()=>setCycle('yearly')}>Annuel</button></div>
      <div className="v54-plan-grid">
        {(Object.values(COMMERCIAL_CONFIG.plans)).map(p=><button key={p.id} className={active===p.id?'selected':''} disabled={busy||user?.role!=='admin'} onClick={()=>choose(p.id)}>
          <strong>{p.name}</strong><span>{p.tagline}</span><b>{euro.format(cycle==='monthly'?p.monthly:p.yearly)}{cycle==='monthly'?'/mois':'/an'}</b><small>{p.users} utilisateur(s)</small>
        </button>)}
      </div>

      {error&&<p className="form-error">{error}</p>}
      <button className="secondary-button" onClick={load}><RefreshCw/>Actualiser le statut</button>

      {!COMMERCIAL_CONFIG.paymentsEnabled&&<div className="notice"><LockKeyhole/><span>Paiement encore désactivé en pré-lancement. Le plan d’essai est toutefois actif et enregistré.</span></div>}
      <div className="notice"><BadgeCheck/><span>Le changement de plan n’efface jamais les données du workspace.</span></div>
    </section>
  </>;
}
