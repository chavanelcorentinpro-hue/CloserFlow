import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDbV64 } from '../server/db-v64.mjs';

const dir=await mkdtemp(join(tmpdir(),'closerflow-db64-'));
try{
 const db=await createDbV64({dataDir:dir}).init();
 await db.upsertWorkspace('alpha',{value:1});
 await db.upsertWorkspace('beta',{value:2});
 const a=await db.getWorkspace('alpha');
 const b=await db.getWorkspace('beta');
 if(a.value!==1||b.value!==2)throw new Error('Isolation DB incorrecte.');
 const list=await db.listWorkspaces();
 if(!list.includes('alpha')||!list.includes('beta'))throw new Error('Liste workspaces incorrecte.');
 console.log('DB V64 PASS');
}finally{await rm(dir,{recursive:true,force:true})}
