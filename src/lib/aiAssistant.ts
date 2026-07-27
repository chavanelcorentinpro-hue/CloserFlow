export type AIAction='quote'|'message'|'analysis'|'summary';
export type AIRequest={action:AIAction; prompt:string; context?:Record<string,unknown>};
export type AIResponse={text:string;createdAt:string;provider:string};
export const AI_ENABLED_KEY='closerflow.ai.enabled.v40';
export function isAIEnabled(){return localStorage.getItem(AI_ENABLED_KEY)!=='false'}
export function setAIEnabled(v:boolean){localStorage.setItem(AI_ENABLED_KEY,String(v))}
export async function askCloserFlowAI(input:AIRequest):Promise<AIResponse>{
 return {text:`Assistant CloserFlow : ${input.prompt}`,createdAt:new Date().toISOString(),provider:'local-ready'};
}
export function volumeShortcutInfo(){return {feature:'double-volume-minus',status:'native-preparation',requiresPermission:true}}
