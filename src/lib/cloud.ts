import type { BackupPayload } from '../context/AppDataContext';
import { createId } from './id';

export type CloudConfig = { apiUrl:string; apiToken:string; workspaceId:string; deviceId:string };
export type SyncEnvelope = { workspaceId:string; deviceId:string; revision:number; updatedAt:string; payload:BackupPayload };
export type SyncHistoryItem = Pick<SyncEnvelope,'deviceId'|'revision'|'updatedAt'|'payload'>;
export class SyncConflictError extends Error { current:{revision:number;updatedAt:string;deviceId:string}; constructor(current:{revision:number;updatedAt:string;deviceId:string}){super('Une version plus récente existe dans le cloud.');this.name='SyncConflictError';this.current=current} }
const CONFIG_KEY='closerflow.cloud.config.v1'; const META_KEY='closerflow.cloud.meta.v1';
const makeDeviceId=()=>createId('device-');
export function readCloudConfig():CloudConfig{const fallback={apiUrl:(window.location.protocol.startsWith('http')?window.location.origin:'http://localhost:8787'),apiToken:'dev-token',workspaceId:'default',deviceId:makeDeviceId()};try{const parsed=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');const config={...fallback,...(parsed||{})};if(!parsed?.deviceId)localStorage.setItem(CONFIG_KEY,JSON.stringify(config));return config}catch{localStorage.setItem(CONFIG_KEY,JSON.stringify(fallback));return fallback}}
export const saveCloudConfig=(config:CloudConfig)=>localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
export function readSyncMeta():{revision:number;lastSyncAt:string|null}{try{return JSON.parse(localStorage.getItem(META_KEY)||'{"revision":0,"lastSyncAt":null}')}catch{return{revision:0,lastSyncAt:null}}}
const saveSyncMeta=(meta:{revision:number;lastSyncAt:string|null})=>localStorage.setItem(META_KEY,JSON.stringify(meta));
async function request<T>(config:CloudConfig,path:string,init?:RequestInit):Promise<T>{const response=await fetch(`${config.apiUrl.replace(/\/$/,'')}${path}`,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.apiToken}`,...(init?.headers||{})}});const body=await response.json().catch(()=>null) as any;if(!response.ok){if(response.status===409&&body?.conflict)throw new SyncConflictError(body.current);throw new Error(body?.error||`Erreur serveur (${response.status})`)}return body as T}
export const checkCloud=(config:CloudConfig)=>request<{ok:boolean;service:string;time:string}>(config,'/api/health');
export async function pushBackup(config:CloudConfig,payload:BackupPayload,force=false){const meta=readSyncMeta();const result=await request<SyncEnvelope>(config,`/api/sync/${encodeURIComponent(config.workspaceId)}`,{method:'PUT',body:JSON.stringify({deviceId:config.deviceId,revision:meta.revision,payload,force})});saveSyncMeta({revision:result.revision,lastSyncAt:result.updatedAt});return result}
export async function pullBackup(config:CloudConfig){const result=await request<SyncEnvelope>(config,`/api/sync/${encodeURIComponent(config.workspaceId)}`);saveSyncMeta({revision:result.revision,lastSyncAt:result.updatedAt});return result}
export const getSyncHistory=(config:CloudConfig)=>request<{history:SyncHistoryItem[]}>(config,`/api/sync/${encodeURIComponent(config.workspaceId)}/history`);
