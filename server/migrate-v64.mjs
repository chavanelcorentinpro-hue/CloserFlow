import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createDbV64 } from './db-v64.mjs';

export async function migrateLegacyWorkspaceJsonV64(dataDir){
  const db=await createDbV64({dataDir}).init();
  const files=(await readdir(dataDir).catch(()=>[]))
    .filter(name=>/^workspace-[a-zA-Z0-9_-]+\.json$/.test(name));

  let migrated=0;
  for(const name of files){
    const workspaceId=name.replace(/^workspace-/,'').replace(/\.json$/,'');
    const raw=await readFile(join(dataDir,name),'utf8');
    const payload=JSON.parse(raw);
    await db.upsertWorkspace(workspaceId,{legacyPayload:payload,migratedAt:new Date().toISOString()});
    migrated++;
  }
  return {migrated};
}
