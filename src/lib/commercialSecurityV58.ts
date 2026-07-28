export const BUILD_FINGERPRINT_V58='e90ac4b5e2b4fb4cdeaeedfb9a916037af2c8cd83aa88468ee6a38eab2c8f528';
export const APP_VERSION_V58='58.0.0';
export function verifyRuntimeEnvelope(){
  const issues:string[]=[];
  if(typeof window!=='undefined'&&!window.isSecureContext&&!['localhost','127.0.0.1'].includes(location.hostname))issues.push('HTTPS requis');
  return {ok:issues.length===0,issues};
}
