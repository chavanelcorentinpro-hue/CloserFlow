
function trimSlash(value){return String(value||'').replace(/\/$/,'')}

export class SupabaseDbV66 {
  constructor({url,serviceKey}){
    this.url=trimSlash(url);
    this.serviceKey=String(serviceKey||'');
    if(!this.url||!this.serviceKey) throw new Error('Configuration Supabase manquante.');
  }
  headers(extra={}){
    return {apikey:this.serviceKey,Authorization:`Bearer ${this.serviceKey}`,'Content-Type':'application/json',...extra};
  }
  async request(path,init={}){
    const r=await fetch(`${this.url}/rest/v1${path}`,{...init,headers:this.headers(init.headers||{})});
    const text=await r.text();
    let body=null; try{body=text?JSON.parse(text):null}catch{body=text}
    if(!r.ok) throw new Error(body?.message||body?.hint||`Supabase ${r.status}`);
    return body;
  }
  async init(){return this}
  async getWorkspace(workspaceId){
    const rows=await this.request(`/closerflow_workspaces?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=workspace_id,payload,updated_at&limit=1`);
    if(!Array.isArray(rows)||!rows[0]) return null;
    return {...(rows[0].payload||{}),workspaceId:rows[0].workspace_id,updatedAt:rows[0].updated_at};
  }
  async upsertWorkspace(workspaceId,payload){
    const now=new Date().toISOString();
    const rows=await this.request('/closerflow_workspaces?on_conflict=workspace_id',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify([{workspace_id:workspaceId,payload,updated_at:now}])
    });
    const row=Array.isArray(rows)?rows[0]:null;
    return {...(row?.payload||payload),workspaceId,updatedAt:row?.updated_at||now};
  }
  async listWorkspaces(){
    const rows=await this.request('/closerflow_workspaces?select=workspace_id');
    return (rows||[]).map(x=>x.workspace_id);
  }
  async deleteWorkspace(workspaceId){
    await this.request(`/closerflow_workspaces?workspace_id=eq.${encodeURIComponent(workspaceId)}`,{method:'DELETE'});
  }
  async backup(label='manual'){
    const workspaces=await this.request('/closerflow_workspaces?select=workspace_id,payload,updated_at');
    const rows=await this.request('/closerflow_backups',{
      method:'POST',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify([{label:String(label).slice(0,80),snapshot:{workspaces},created_at:new Date().toISOString()}])
    });
    return rows?.[0]?.id||null;
  }
  async listBackups(){
    return await this.request('/closerflow_backups?select=id,label,created_at&order=created_at.desc&limit=50')||[];
  }
  async read(){
    const workspaces=await this.listWorkspaces();
    return {version:66,workspaces:Object.fromEntries(workspaces.map(x=>[x,true]))};
  }
}
export function createSupabaseDbV66(config){return new SupabaseDbV66(config)}
