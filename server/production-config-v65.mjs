import { resolve } from 'node:path';

export function loadProductionConfigV65(env=process.env){
  return {
    dataDir: resolve(env.CLOSERFLOW_DATA_DIR || './data'),
    origins: String(env.CLOSERFLOW_ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean),
    port: Number(env.PORT || 8787),
    production: env.NODE_ENV === 'production'
  };
}

export function validateProductionConfigV65(cfg){
  const errors=[];
  if(!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) errors.push('PORT invalide.');
  if(cfg.production && cfg.origins.length === 0) errors.push('Origines requises.');
  if(cfg.origins.includes('*')) errors.push('Wildcard CORS interdite.');
  if(cfg.origins.some(x => !/^https:\/\//i.test(x) && !/^http:\/\/localhost(?::\d+)?$/i.test(x))) errors.push('HTTPS requis.');
  return { ok: errors.length === 0, errors };
}
