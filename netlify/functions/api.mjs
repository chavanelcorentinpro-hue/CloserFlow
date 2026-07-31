import { createSupabaseDbV66 } from '../../server/db-supabase-v66.mjs';

const json=(statusCode,body,extra={})=>({
  statusCode,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra},
  body:JSON.stringify(body)
});

function allowedOrigin(event){
  const configured=String(process.env.CLOSERFLOW_ALLOWED_ORIGINS||'')
    .split(',').map(x=>x.trim()).filter(Boolean);
  const origin=event.headers?.origin||event.headers?.Origin||'';
  if(!origin) return '';
  return configured.includes(origin)?origin:null;
}

function db(){
  return createSupabaseDbV66({
    url:process.env.SUPABASE_URL,
    serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}

export async function handler(event){
  const origin=allowedOrigin(event);
  if(origin===null) return json(403,{ok:false,error:'Origin not allowed'});
  const cors=origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{};

  if(event.httpMethod==='OPTIONS'){
    return {statusCode:204,headers:{...cors,'access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'content-type,authorization'},body:''};
  }

  const rawPath=event.path||'';
  const path=rawPath.replace(/^\/\.netlify\/functions\/api/,'')||'/';

  if(event.httpMethod==='GET' && (path==='/health'||path==='/api/health'||path==='/api/health/live')){
    return json(200,{ok:true,service:'CloserFlow API',version:'67.0.0',runtime:'netlify-functions'},cors);
  }

  if(event.httpMethod==='GET' && (path==='/ready'||path==='/api/health/ready')){
    try{
      await db().read();
      return json(200,{ready:true,service:'CloserFlow API',version:'67.0.0',databaseDriver:'supabase',runtime:'netlify-functions'},cors);
    }catch(e){
      return json(503,{ready:false,error:'Database unavailable'},cors);
    }
  }

  return json(404,{ok:false,error:'Route not found'},cors);
}
