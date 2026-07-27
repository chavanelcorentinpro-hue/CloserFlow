import type { PlanId } from './commercialV54';

export type SubscriptionV55={
  workspaceId:string; companyName:string; plan:PlanId;
  status:'trial'|'trial_expired'|'active'|'past_due'|'cancelled';
  trialStartedAt:string; trialEndsAt:string; createdAt:string; updatedAt:string;
  paymentsEnabled:boolean;
  limits:{users:number;storageMb:number};
};

async function request<T>(apiUrl:string,token:string,path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(`${apiUrl.replace(/\/$/,'')}${path}`,{
    ...init,
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init?.headers||{})}
  });
  const body=await response.json().catch(()=>({})) as any;
  if(!response.ok)throw new Error(body.error||`Erreur serveur (${response.status})`);
  return body as T;
}

export const fetchSubscription=(apiUrl:string,token:string)=>
  request<{subscription:SubscriptionV55}>(apiUrl,token,'/api/billing/status');

export const changeTrialPlan=(apiUrl:string,token:string,plan:PlanId)=>
  request<{subscription:SubscriptionV55}>(apiUrl,token,'/api/billing/plan',{
    method:'PUT',body:JSON.stringify({plan})
  });

export function daysLeft(subscription:SubscriptionV55|null){
  if(!subscription)return 0;
  return Math.max(0,Math.ceil((new Date(subscription.trialEndsAt).getTime()-Date.now())/86400000));
}
