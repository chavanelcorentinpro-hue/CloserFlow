export type DbHealthV64={
 version:string;backend:string;initialized:boolean;
 currentWorkspace:string;workspaceCount:number;legacyMigrated:number;
};
async function req<T>(apiUrl:string,token:string,path:string,init?:RequestInit):Promise<T>{
 const r=await fetch(`${apiUrl.replace(/\/$/,'')}${path}`,{
  ...init,
  headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init?.headers||{})},
  cache:'no-store'
 });
 const body=await r.json().catch(()=>({})) as any;
 if(!r.ok)throw new Error(body.error||`Erreur serveur (${r.status})`);
 return body as T;
}
export const fetchDbHealthV64=(apiUrl:string,token:string)=>req<DbHealthV64>(apiUrl,token,'/api/db/health');
export const createBackupV64=(apiUrl:string,token:string)=>req<{backup:string}>(apiUrl,token,'/api/backups',{method:'POST'});
export const listBackupsV64=(apiUrl:string,token:string)=>req<{backups:string[]}>(apiUrl,token,'/api/backups');
