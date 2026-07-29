export type ProductionHealthV62={
  service:string;version:string;production?:boolean;ready:boolean;
  checks:{persistentDataDir:boolean;restrictedOrigins:boolean}
};
export async function fetchProductionHealthV62(apiUrl:string):Promise<ProductionHealthV62>{
  const r=await fetch(`${apiUrl.replace(/\/$/,'')}/api/health/production`,{cache:'no-store'});
  const body=await r.json().catch(()=>({})) as any;
  if(!r.ok&&r.status!==503)throw new Error(body.error||`API indisponible (${r.status})`);
  return body as ProductionHealthV62;
}
