export type TenantStatusV63={
 version:string;isolated:boolean;workspaceId:string;
 storageConfined:boolean;atomicWrites:boolean;storageFile:string
};
export async function fetchTenantStatusV63(apiUrl:string,token:string):Promise<TenantStatusV63>{
 const r=await fetch(`${apiUrl.replace(/\/$/,'')}/api/security/tenant-status`,{
  cache:'no-store',headers:{Authorization:`Bearer ${token}`}
 });
 const body=await r.json().catch(()=>({})) as any;
 if(!r.ok)throw new Error(body.error||`Erreur isolation (${r.status})`);
 return body as TenantStatusV63;
}
