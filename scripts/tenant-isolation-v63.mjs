import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertWorkspaceOwnershipV63, atomicWriteJsonV63,
  workspaceFileV63
} from '../server/storage-v63.mjs';

const dir=await mkdtemp(join(tmpdir(),'closerflow-v63-'));
let pass=true;
const fail=msg=>{console.error('FAIL:',msg);pass=false};

try{
  const a=workspaceFileV63(dir,'company_a');
  const b=workspaceFileV63(dir,'company_b');
  if(a===b)fail('Deux workspaces utilisent le même fichier.');

  try{workspaceFileV63(dir,'../escape');fail('Path traversal accepté.')}catch{}
  try{assertWorkspaceOwnershipV63('company_a','company_b');fail('Accès inter-workspace accepté.')}catch{}

  await atomicWriteJsonV63(a,{workspaceId:'company_a',secret:'A'});
  await atomicWriteJsonV63(b,{workspaceId:'company_b',secret:'B'});

  const aa=JSON.parse(await readFile(a,'utf8'));
  const bb=JSON.parse(await readFile(b,'utf8'));
  if(aa.secret!=='A'||bb.secret!=='B')fail('Données croisées.');

  await Promise.all([
    atomicWriteJsonV63(a,{workspaceId:'company_a',revision:2}),
    atomicWriteJsonV63(b,{workspaceId:'company_b',revision:2})
  ]);
}catch(e){
  fail(e instanceof Error?e.message:String(e));
}finally{
  await rm(dir,{recursive:true,force:true});
}

if(!pass)process.exit(1);
console.log('TENANT ISOLATION V63 PASS');
