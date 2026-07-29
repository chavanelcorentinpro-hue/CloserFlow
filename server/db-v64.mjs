import { mkdir, readFile, writeFile, rename, rm, readdir, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

export class CloserFlowDbV64 {
  constructor({ dataDir }) {
    this.dataDir = resolve(dataDir || './data');
    this.dbFile = join(this.dataDir, 'closerflow-db-v64.json');
    this.backupDir = join(this.dataDir, 'backups');
  }

  async init() {
    await mkdir(this.dataDir,{recursive:true});
    await mkdir(this.backupDir,{recursive:true});
    try { await readFile(this.dbFile,'utf8'); }
    catch { await this.atomicWrite({version:1,workspaces:{},meta:{createdAt:new Date().toISOString()}}); }
    return this;
  }

  async read() {
    const raw = await readFile(this.dbFile,'utf8');
    const data = JSON.parse(raw);
    if(!data.workspaces || typeof data.workspaces!=='object') throw new Error('Base invalide.');
    return data;
  }

  async atomicWrite(data) {
    await mkdir(dirname(this.dbFile),{recursive:true});
    const tmp = `${this.dbFile}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      await writeFile(tmp,JSON.stringify(data,null,2),'utf8');
      await rename(tmp,this.dbFile);
    } catch (error) {
      await rm(tmp,{force:true}).catch(()=>undefined);
      throw error;
    }
  }

  async getWorkspace(workspaceId) {
    const data = await this.read();
    return structuredClone(data.workspaces[workspaceId] || null);
  }

  async upsertWorkspace(workspaceId, payload) {
    const data = await this.read();
    const previous = data.workspaces[workspaceId] || {};
    data.workspaces[workspaceId] = {
      ...previous,
      ...structuredClone(payload),
      workspaceId,
      updatedAt:new Date().toISOString()
    };
    await this.atomicWrite(data);
    return structuredClone(data.workspaces[workspaceId]);
  }

  async listWorkspaces() {
    const data = await this.read();
    return Object.keys(data.workspaces);
  }

  async deleteWorkspace(workspaceId) {
    const data = await this.read();
    delete data.workspaces[workspaceId];
    await this.atomicWrite(data);
  }

  async backup(label='auto') {
    const safe=String(label).replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,40)||'auto';
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    const target=join(this.backupDir,`${stamp}-${safe}.json`);
    await copyFile(this.dbFile,target);
    return target;
  }

  async listBackups() {
    await mkdir(this.backupDir,{recursive:true});
    return (await readdir(this.backupDir))
      .filter(x=>x.endsWith('.json'))
      .sort()
      .reverse();
  }

  async restoreBackup(filename) {
    const safe=String(filename).replace(/[^a-zA-Z0-9_.-]/g,'');
    if(!safe || safe!==filename) throw new Error('Nom de sauvegarde invalide.');
    const source=join(this.backupDir,safe);
    const before=await this.backup('before-restore');
    const raw=await readFile(source,'utf8');
    const parsed=JSON.parse(raw);
    if(!parsed.workspaces || typeof parsed.workspaces!=='object') throw new Error('Sauvegarde invalide.');
    await this.atomicWrite(parsed);
    return {restored:safe,preRestoreBackup:before};
  }
}

export function createDbV64(config) {
  return new CloserFlowDbV64(config);
}
