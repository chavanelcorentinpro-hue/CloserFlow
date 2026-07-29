import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDbV64 } from '../server/db-v64.mjs';

const dir=await mkdtemp(join(tmpdir(),'closerflow-bak64-'));
try{
 const db=await createDbV64({dataDir:dir}).init();
 await db.upsertWorkspace('alpha',{value:1});
 const file=(await db.backup('test')).split('/').pop();
 await db.upsertWorkspace('alpha',{value:999});
 await db.restoreBackup(file);
 const a=await db.getWorkspace('alpha');
 if(a.value!==1)throw new Error('Restauration incorrecte.');
 console.log('BACKUP V64 PASS');
}finally{await rm(dir,{recursive:true,force:true})}
