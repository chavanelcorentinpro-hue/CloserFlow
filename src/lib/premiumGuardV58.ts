import { fetchEntitlements } from './entitlementsV57';
export async function requirePremiumCapability(apiUrl:string,token:string,capability:'ai'|'pricing'|'cloud'|'team'|'advancedMargin'){
  if(!token||token==='local-device')throw new Error('Connexion serveur requise.');
  const data=await fetchEntitlements(apiUrl,token);
  if(!data.active)throw new Error(data.reason||'Licence inactive.');
  if(!data.entitlements[capability])throw new Error('Fonction non incluse dans ce plan.');
  return data;
}
