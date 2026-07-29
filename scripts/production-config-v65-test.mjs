import { loadProductionConfigV65, validateProductionConfigV65 } from '../server/production-config-v65.mjs';

const good=loadProductionConfigV65({
  NODE_ENV:'production',
  PORT:'8787',
  CLOSERFLOW_DATA_DIR:'/var/lib/closerflow',
  CLOSERFLOW_ALLOWED_ORIGINS:'https://app.example.com'
});
if(!validateProductionConfigV65(good).ok) throw new Error('Valid config refused.');

const bad=loadProductionConfigV65({
  NODE_ENV:'production',
  PORT:'8787',
  CLOSERFLOW_DATA_DIR:'/var/lib/closerflow',
  CLOSERFLOW_ALLOWED_ORIGINS:'*'
});
if(validateProductionConfigV65(bad).ok) throw new Error('Wildcard CORS accepted.');

console.log('PRODUCTION CONFIG V65 PASS');
