export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/,'');
export const PUBLIC_API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'');
export const PUBLIC_APP_NAME = import.meta.env.VITE_APP_NAME || 'CloserFlow';

export function resolveApiUrl(current:string){
  const value=(current||'').trim();
  if(PUBLIC_API_URL)return PUBLIC_API_URL;
  if(value)return value.replace(/\/$/,'');
  return window.location.origin;
}

export function isPublicHost(){
  return ['http:','https:'].includes(window.location.protocol);
}

export function publicShareUrl(path='/welcome'){
  return `${PUBLIC_SITE_URL}${path.startsWith('/')?path:`/${path}`}`;
}
