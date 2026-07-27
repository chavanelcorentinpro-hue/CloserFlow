import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Building2, Check, LockKeyhole,
  Mail, Rocket, ShieldCheck, Sparkles, UserRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMMERCIAL_CONFIG, trackFunnel, type PlanId } from '../lib/commercialV54';

const planNames:Record<PlanId,string>={solo:'Solo',team:'Équipe',pro:'Pro'};
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});

function slugify(value:string){
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
}

export function PublicSignupV55Page(){
  const {signedIn,register,apiUrl,setApiUrl}=useAuth();
  const [params]=useSearchParams();
  const requested=(params.get('plan')||'solo') as PlanId;
  const [plan,setPlan]=useState<PlanId>(['solo','team','pro'].includes(requested)?requested:'solo');
  const [company,setCompany]=useState('');
  const [workspace,setWorkspace]=useState('');
  const [manualSlug,setManualSlug]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const details=COMMERCIAL_CONFIG.plans[plan];
  const suggested=useMemo(()=>slugify(company)||'mon-entreprise',[company]);

  if(signedIn)return <Navigate to="/onboarding-v55" replace/>;

  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setBusy(true);setError('');
    const fd=new FormData(e.currentTarget);
    const workspaceId=(workspace||suggested).replace(/-/g,'_');
    try{
      trackFunnel('signup_click',plan);
      await register({
        displayName:String(fd.get('displayName')||''),
        email:String(fd.get('email')||''),
        password:String(fd.get('password')||''),
        workspaceId,
        companyName:company,
        plan
      });
    }catch(err){setError(err instanceof Error?err.message:'Inscription impossible.')}
    finally{setBusy(false)}
  };

  return <main className="v55-signup-page">
    <section className="v55-signup-copy">
      <Link to="/welcome" className="v55-back"><ArrowLeft/>CloserFlow</Link>
      <p className="eyebrow">ESSAI GRATUIT · {COMMERCIAL_CONFIG.trialDays} JOURS</p>
      <h1>Ton espace CloserFlow est prêt en moins d’une minute.</h1>
      <p>Crée ton entreprise, choisis ton plan d’essai et commence immédiatement. Aucun paiement n’est demandé.</p>
      <div className="v55-benefits">
        <span><Check/>Devis & factures</span>
        <span><Check/>Chantiers & planning</span>
        <span><Check/>Stock intelligent</span>
        <span><Check/>IA métier</span>
      </div>
    </section>

    <section className="v55-signup-card">
      <div className="section-heading"><div><p className="eyebrow">CRÉER MON COMPTE</p><h2>{planNames[plan]}</h2></div><Rocket/></div>

      <div className="v55-plan-switch">
        {(Object.keys(COMMERCIAL_CONFIG.plans) as PlanId[]).map(id=><button type="button" key={id} className={plan===id?'active':''} onClick={()=>setPlan(id)}>
          <strong>{planNames[id]}</strong><small>{euro.format(COMMERCIAL_CONFIG.plans[id].monthly)}/mois après essai</small>
        </button>)}
      </div>

      <form onSubmit={submit}>
        <label>Entreprise<div className="input-with-icon"><Building2/><input required value={company} onChange={e=>{setCompany(e.target.value);if(!manualSlug)setWorkspace(slugify(e.target.value))}} placeholder="Entreprise Dupont"/></div></label>
        <label>Votre nom<div className="input-with-icon"><UserRound/><input name="displayName" required minLength={2} autoComplete="name" placeholder="Jean Dupont"/></div></label>
        <label>E-mail<div className="input-with-icon"><Mail/><input name="email" type="email" required autoComplete="email" placeholder="jean@entreprise.fr"/></div></label>
        <label>Mot de passe<div className="input-with-icon"><LockKeyhole/><input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8 caractères minimum"/></div></label>
        <label>Identifiant espace
          <input value={workspace||suggested} onChange={e=>{setManualSlug(true);setWorkspace(slugify(e.target.value))}} required pattern="[a-z0-9-]+" />
          <small>Utilisé pour isoler les données de votre entreprise.</small>
        </label>

        <details className="v55-server">
          <summary>Configuration serveur avancée</summary>
          <label>Adresse API<input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} /></label>
        </details>

        {error&&<p className="form-error">{error}</p>}
        <button className="primary v55-create" disabled={busy}><Sparkles/>{busy?'Création…':`Démarrer l’essai ${planNames[plan]}`}</button>
      </form>

      <div className="v55-trust">
        <span><ShieldCheck/>Données isolées par entreprise</span>
        <span><BadgeCheck/>Aucune carte bancaire</span>
      </div>
      <p className="auth-note">Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
    </section>
  </main>;
}
