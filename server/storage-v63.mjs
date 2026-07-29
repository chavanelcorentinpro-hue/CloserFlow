import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';

export const SAFE_WORKSPACE_V63=/^[a-zA-Z0-9_-]{1,80}$/;

export function assertWorkspaceV63(workspace){
  const value=String(workspace||'');
  if(!SAFE_WORKSPACE_V63.test(value)) throw new Error('Workspace invalide.');
  return value;
}

export function confinedPathV63(dataDir,filename){
  const root=resolve(dataDir);
  const target=resolve(root,filename);
  if(target!==root&&!target.startsWith(root+sep)) throw new Error('Chemin de stockage interdit.');
  return target;
}

export function workspaceFileV63(dataDir,workspace,suffix=''){
  const id=assertWorkspaceV63(workspace);
  return confinedPathV63(dataDir,`workspace-${id}${suffix}.json`);
}

export async function readJsonV63(file,fallback){
  try{return JSON.parse(await readFile(file,'utf8'))}
  catch{return typeof fallback==='function'?fallback():structuredClone(fallback)}
}

export async function atomicWriteJsonV63(file,value){
  await mkdir(dirname(file),{recursive:true});
  const tmp=`${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try{
    await writeFile(tmp,JSON.stringify(value,null,2),'utf8');
    await rename(tmp,file);
  }catch(error){
    await rm(tmp,{force:true}).catch(()=>undefined);
    throw error;
  }
}

export function assertWorkspaceOwnershipV63(sessionWorkspace,resourceWorkspace){
  const session=assertWorkspaceV63(sessionWorkspace);
  const resource=assertWorkspaceV63(resourceWorkspace);
  if(session!==resource) throw new Error('Accès inter-workspace refusé.');
  return true;
}
