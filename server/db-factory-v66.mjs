
import { createDbV64 } from './db-v64.mjs';
import { createSupabaseDbV66 } from './db-supabase-v66.mjs';

export async function createDatabaseV66(env=process.env){
  if(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY){
    const db=createSupabaseDbV66({url:env.SUPABASE_URL,serviceKey:env.SUPABASE_SERVICE_ROLE_KEY});
    await db.init();
    return {db,driver:'supabase'};
  }
  const db=await createDbV64({dataDir:env.CLOSERFLOW_DATA_DIR||'./data'}).init();
  return {db,driver:'local-json'};
}
