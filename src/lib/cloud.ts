import type { BackupPayload } from '../context/AppDataContext';
import { createId } from './id';

export type CloudConfig = { apiUrl:string; apiToken:string; workspaceId:string; deviceId:string };
export type SyncEnvelope = { workspaceId:string; deviceId:string; revision:number; updatedAt:string; payload:BackupPayload };
export type SyncHistoryItem = Pick<SyncEnvelope,'deviceId'|'revision'|'updatedAt'|'payload'>;
export type DeviceRecord = {
  id:string; workspaceId:string; userId:string; deviceId:string; label:string; platform:string;
  trusted:boolean; createdAt:string; lastSeenAt:string; revokedAt:string|null;
};
export type PlatformSummary = {
  workspaceId:string; revision:number; updatedAt:string|null; devices:number;
  audit:Array<{id:string;createdAt:string;actor?:string;action:string;detail?:string}>;
};
export class SyncConflictError extends Error {
  current:{revision:number;updatedAt:string;deviceId:string};
  constructor(current:{revision:number;updatedAt:string;deviceId:string}){
    super('Une version plus récente existe dans le cloud.');
    this.name='SyncConflictError';
    this.current=current;
  }
}

const CONFIG_KEY='closerflow.cloud.config.v1';
const META_KEY='closerflow.cloud.meta.v2';
const DEVICE_LABEL_KEY='closerflow.cloud.device-label.v34';
const makeDeviceId=()=>createId('device-');

export function readCloudConfig():CloudConfig{
  const fallback={
    apiUrl:(window.location.protocol.startsWith('http')?window.location.origin:'http://localhost:8787'),
    apiToken:'dev-token',
    workspaceId:'default',
    deviceId:makeDeviceId()
  };
  try{
    const parsed=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');
    const config={...fallback,...(parsed||{})};
    if(!parsed?.deviceId)localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
    return config;
  }catch{
    localStorage.setItem(CONFIG_KEY,JSON.stringify(fallback));
    return fallback;
  }
}
export const saveCloudConfig=(config:CloudConfig)=>localStorage.setItem(CONFIG_KEY,JSON.stringify(config));

export type SyncMeta={revision:number;lastSyncAt:string|null;lastPushAt:string|null;lastPullAt:string|null;remoteRevision:number|null};
export function readSyncMeta():SyncMeta{
  try{
    const value=JSON.parse(localStorage.getItem(META_KEY)||'null');
    return {revision:Number(value?.revision||0),lastSyncAt:value?.lastSyncAt||null,lastPushAt:value?.lastPushAt||null,lastPullAt:value?.lastPullAt||null,remoteRevision:value?.remoteRevision??null};
  }catch{
    return {revision:0,lastSyncAt:null,lastPushAt:null,lastPullAt:null,remoteRevision:null};
  }
}
const saveSyncMeta=(meta:SyncMeta)=>localStorage.setItem(META_KEY,JSON.stringify(meta));
const mergeMeta=(patch:Partial<SyncMeta>)=>saveSyncMeta({...readSyncMeta(),...patch});

export function readDeviceLabel(){
  return localStorage.getItem(DEVICE_LABEL_KEY)||`${navigator.platform||'Android'} · CloserFlow`;
}
export function saveDeviceLabel(label:string){
  localStorage.setItem(DEVICE_LABEL_KEY,label.trim().slice(0,120)||'CloserFlow');
}

async function request<T>(config:CloudConfig,path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(`${config.apiUrl.replace(/\/$/,'')}${path}`,{
    ...init,
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.apiToken}`,...(init?.headers||{})}
  });
  const body=await response.json().catch(()=>null) as any;
  if(!response.ok){
    if(response.status===409&&body?.conflict)throw new SyncConflictError(body.current);
    throw new Error(body?.error||`Erreur serveur (${response.status})`);
  }
  return body as T;
}

export const checkCloud=(config:CloudConfig)=>request<{ok:boolean;service:string;version?:string;time:string}>(config,'/api/health');

export async function peekBackup(config:CloudConfig){
  const result=await request<SyncEnvelope>(config,`/api/sync/${encodeURIComponent(config.workspaceId)}`);
  mergeMeta({remoteRevision:result.revision});
  return result;
}
export function acceptPulledRevision(result:SyncEnvelope){
  mergeMeta({revision:result.revision,remoteRevision:result.revision,lastSyncAt:result.updatedAt,lastPullAt:result.updatedAt});
}
export async function pullBackup(config:CloudConfig){
  const result=await peekBackup(config);
  acceptPulledRevision(result);
  return result;
}
export async function pushBackup(config:CloudConfig,payload:BackupPayload,force=false){
  const meta=readSyncMeta();
  const result=await request<SyncEnvelope>(config,`/api/sync/${encodeURIComponent(config.workspaceId)}`,{
    method:'PUT',
    body:JSON.stringify({deviceId:config.deviceId,revision:meta.revision,payload,force})
  });
  mergeMeta({revision:result.revision,remoteRevision:result.revision,lastSyncAt:result.updatedAt,lastPushAt:result.updatedAt});
  return result;
}
export const getSyncHistory=(config:CloudConfig)=>request<{history:SyncHistoryItem[]}>(config,`/api/sync/${encodeURIComponent(config.workspaceId)}/history`);

export const getPlatformSummary=(config:CloudConfig)=>request<PlatformSummary>(config,'/api/platform/summary');
export const listDevices=(config:CloudConfig)=>request<{devices:DeviceRecord[]}>(config,'/api/devices');
export const registerDevice=(config:CloudConfig,label:string)=>request<{ok:boolean}>(config,'/api/devices/register',{
  method:'POST',
  body:JSON.stringify({deviceId:config.deviceId,label:label.trim()||'CloserFlow',platform:navigator.userAgent.slice(0,120)})
});
export const trustDevice=(config:CloudConfig,id:string)=>request<{ok:boolean}>(config,`/api/devices/${encodeURIComponent(id)}/trust`,{method:'PUT'});
export const revokeDevice=(config:CloudConfig,id:string)=>request<{ok:boolean}>(config,`/api/devices/${encodeURIComponent(id)}`,{method:'DELETE'});
