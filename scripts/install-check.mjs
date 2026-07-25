import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
  ['typescript','node_modules/typescript/lib/typescript.js'],
  ['vite','node_modules/vite/package.json'],
  ['react','node_modules/react/package.json'],
  ['react-dom','node_modules/react-dom/package.json'],
  ['@types/node','node_modules/@types/node/package.json'],
  ['@types/react','node_modules/@types/react/package.json'],
  ['@types/react-dom','node_modules/@types/react-dom/package.json']
];
const missing=required.filter(([,p])=>!fs.existsSync(path.join(root,p))).map(([n])=>n);
if(missing.length){
  console.error('Installation npm incomplète. Paquets manquants:',missing.join(', '));
  console.error('Relancer: rm -rf node_modules && npm ci --no-audit --no-fund');
  process.exit(1);
}
console.log('PASS installation npm minimale vérifiée');
