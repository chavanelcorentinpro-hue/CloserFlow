process.env.CLOSERFLOW_ALLOWED_ORIGINS='https://app.example.com';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-secret';

globalThis.fetch=async url=>{
  if(String(url).includes('closerflow_workspaces?select=workspace_id')){
    return new Response(JSON.stringify([{workspace_id:'alpha'}]),{status:200});
  }
  return new Response(JSON.stringify([]),{status:200});
};

const {handler}=await import('../netlify/functions/api.mjs');

const base={headers:{origin:'https://app.example.com'}};
const h=await handler({...base,httpMethod:'GET',path:'/.netlify/functions/api/health'});
if(h.statusCode!==200||!h.body.includes('"version":"67.0.0"')) throw new Error('Health failed');

const r=await handler({...base,httpMethod:'GET',path:'/.netlify/functions/api/api/health/ready'});
if(r.statusCode!==200||!r.body.includes('"databaseDriver":"supabase"')) throw new Error('Ready failed');

const denied=await handler({httpMethod:'GET',path:'/.netlify/functions/api/health',headers:{origin:'https://evil.example'}});
if(denied.statusCode!==403) throw new Error('CORS failed');

console.log('NETLIFY FUNCTION V67 PASS');
