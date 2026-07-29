
import { createSupabaseDbV66 } from '../server/db-supabase-v66.mjs';

const calls=[];
globalThis.fetch=async (url,init={})=>{
  calls.push({url,init});
  const u=String(url);
  if(u.includes('workspace_id=eq.alpha')){
    return new Response(JSON.stringify([{workspace_id:'alpha',payload:{name:'A'},updated_at:'2026-01-01T00:00:00Z'}]),{status:200});
  }
  if(u.includes('on_conflict=workspace_id')){
    return new Response(JSON.stringify([{workspace_id:'alpha',payload:{name:'B'},updated_at:'2026-01-02T00:00:00Z'}]),{status:200});
  }
  if(u.includes('select=workspace_id')){
    return new Response(JSON.stringify([{workspace_id:'alpha'},{workspace_id:'beta'}]),{status:200});
  }
  return new Response(JSON.stringify([]),{status:200});
};

const db=createSupabaseDbV66({url:'https://example.supabase.co',serviceKey:'server-secret'});
const a=await db.getWorkspace('alpha');
if(a.name!=='A'||a.workspaceId!=='alpha') throw new Error('Lecture invalide.');
const b=await db.upsertWorkspace('alpha',{name:'B'});
if(b.name!=='B') throw new Error('Upsert invalide.');
const list=await db.listWorkspaces();
if(list.join(',')!=='alpha,beta') throw new Error('Liste invalide.');
if(!calls.every(x=>x.init.headers?.apikey==='server-secret')) throw new Error('Clé serveur absente.');
console.log('SUPABASE ADAPTER V66 PASS');
