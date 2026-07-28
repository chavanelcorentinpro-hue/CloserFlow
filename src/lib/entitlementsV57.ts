export type EntitlementsV57={
  active:boolean; reason:string|null; plan:'solo'|'team'|'pro';
  entitlements:{ai:boolean;pricing:boolean;cloud:boolean;team:boolean;advancedMargin:boolean};
};
export async function fetchEntitlements(apiUrl:string,token:string):Promise<EntitlementsV57>{
  const response=await fetch(`${apiUrl.replace(/\/$/,'')}/api/entitlements`,{headers:{Authorization:`Bearer ${token}`}});
  const body=await response.json().catch(()=>({})) as any;
  if(!response.ok)throw new Error(body.error||`Erreur serveur (${response.status})`);
  return body as EntitlementsV57;
}
