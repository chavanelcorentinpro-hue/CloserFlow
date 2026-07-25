import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AccountRole = 'admin' | 'manager' | 'employee';
export type AccountUser = { id:string; email:string; displayName:string; role:AccountRole; workspaceId:string; createdAt:string };
type Credentials = { email:string; password:string };
type Registration = Credentials & { displayName:string; workspaceId:string };
type InviteAcceptance = { code:string; displayName:string; password:string };
type AuthValue={
 signedIn:boolean; loading:boolean; user:AccountUser|null; displayName:string; token:string;
 signIn:(credentials:Credentials)=>Promise<void>; register:(input:Registration)=>Promise<void>; acceptInvite:(input:InviteAcceptance)=>Promise<void>; localSignIn:(displayName?:string)=>Promise<void>; signOut:()=>Promise<void>;
 apiUrl:string; setApiUrl:(value:string)=>void;
};
const AuthCtx=createContext<AuthValue|null>(null);
const KEY='closerflow.auth.v2';
const API_KEY='closerflow.auth.api-url';
const defaultApi=()=>localStorage.getItem(API_KEY)||(window.location.protocol.startsWith('http')?window.location.origin:'http://127.0.0.1:8787');

export function AuthProvider({children}:{children:ReactNode}){
 const [apiUrl,setApiUrlState]=useState(defaultApi);
 const [session,setSession]=useState<{token:string;user:AccountUser}|null>(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}});
 const [loading,setLoading]=useState(true);
 const setApiUrl=(value:string)=>{const clean=value.trim().replace(/\/$/,'');setApiUrlState(clean);localStorage.setItem(API_KEY,clean)};
 useEffect(()=>{if(session)localStorage.setItem(KEY,JSON.stringify(session));else localStorage.removeItem(KEY)},[session]);
 useEffect(()=>{
  let active=true;
  const verify=async()=>{
   if(!session){setLoading(false);return}
   if(session.token==='local-device'){setLoading(false);return}
   try{const response=await fetch(`${apiUrl}/api/auth/me`,{headers:{Authorization:`Bearer ${session.token}`}});if(!response.ok)throw new Error();const body=await response.json();if(active)setSession({token:session.token,user:body.user})}
   catch{if(active)setSession(null)}finally{if(active)setLoading(false)}
  };verify();return()=>{active=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const request=async(path:string,payload:unknown)=>{const response=await fetch(`${apiUrl}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Le serveur CloserFlow ne répond pas.');return body};
 const value=useMemo<AuthValue>(()=>({
  signedIn:!!session,loading,user:session?.user||null,displayName:session?.user.displayName||'',token:session?.token||'',apiUrl,setApiUrl,
  signIn:async credentials=>{const body=await request('/api/auth/login',credentials);setSession(body)},
  register:async input=>{const body=await request('/api/auth/register',input);setSession(body)},
  acceptInvite:async input=>{const body=await request('/api/auth/accept-invite',input);setSession(body)},
  localSignIn:async(displayName='Utilisateur')=>{const now=new Date().toISOString();setSession({token:'local-device',user:{id:'local-admin',email:'local@closerflow.app',displayName:displayName.trim()||'Utilisateur',role:'admin',workspaceId:'local',createdAt:now}})},
  signOut:async()=>{const current=session;setSession(null);if(current&&current.token!=='local-device')fetch(`${apiUrl}/api/auth/logout`,{method:'POST',headers:{Authorization:`Bearer ${current.token}`}}).catch(()=>undefined)},
 }),[session,loading,apiUrl]);
 return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export function useAuth(){const value=useContext(AuthCtx);if(!value)throw new Error('useAuth must be used inside AuthProvider');return value}
