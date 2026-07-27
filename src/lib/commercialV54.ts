export type PlanId='solo'|'team'|'pro';
export type BillingCycle='monthly'|'yearly';

export const COMMERCIAL_CONFIG={
  trialDays:14,
  paymentsEnabled:false,
  plans:{
    solo:{id:'solo' as PlanId,name:'Solo',monthly:19,yearly:190,users:1,tagline:'Pour l’artisan indépendant'},
    team:{id:'team' as PlanId,name:'Équipe',monthly:49,yearly:490,users:5,tagline:'Pour les petites équipes'},
    pro:{id:'pro' as PlanId,name:'Pro',monthly:99,yearly:990,users:25,tagline:'Pour les entreprises en croissance'}
  }
};

export type FunnelEvent={
  id:string;type:'landing_view'|'pricing_view'|'trial_click'|'signup_click'|'plan_select';
  plan?:PlanId;createdAt:string;source?:string;
};
const FUNNEL_KEY='closerflow.v54.funnel';
export function trackFunnel(type:FunnelEvent['type'],plan?:PlanId){
  try{
    const rows:FunnelEvent[]=JSON.parse(localStorage.getItem(FUNNEL_KEY)||'[]');
    rows.unshift({id:`f-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type,plan,createdAt:new Date().toISOString(),source:document.referrer||'direct'});
    localStorage.setItem(FUNNEL_KEY,JSON.stringify(rows.slice(0,5000)));
  }catch{}
}
export function loadFunnel():FunnelEvent[]{try{return JSON.parse(localStorage.getItem(FUNNEL_KEY)||'[]')}catch{return []}}

export const featureMatrix=[
  ['Clients, devis, factures',true,true,true],
  ['Chantiers & planning',true,true,true],
  ['Stock & fournisseurs',true,true,true],
  ['Cloud multi-appareils',false,true,true],
  ['Équipe & validations',false,true,true],
  ['IA devis & prix',true,true,true],
  ['Pilotage marge avancé',false,false,true],
] as const;
