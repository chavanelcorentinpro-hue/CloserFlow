import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const nm=path.join(root,'node_modules');
if(!fs.existsSync(nm)){console.error('FAIL node_modules absent');process.exit(1)}

const critical=[
 ['typescript','typescript/package.json'],
 ['vite','vite/package.json'],
 ['react','react/package.json'],
 ['react-dom','react-dom/package.json'],
 ['react-router-dom','react-router-dom/package.json'],
 ['lucide-react','lucide-react/package.json'],
 ['@vitejs/plugin-react','@vitejs/plugin-react/package.json'],
 ['@types/node','@types/node/package.json'],
 ['@types/react','@types/react/package.json'],
 ['@types/react-dom','@types/react-dom/package.json'],
 ['@capacitor/core','@capacitor/core/package.json'],
 ['@capacitor/android','@capacitor/android/package.json'],
 ['@capacitor/cli','@capacitor/cli/package.json']
];
const missing=[];
for(const [name,rel] of critical){
  const p=path.join(nm,rel);
  if(!fs.existsSync(p)){missing.push(name);continue}
  try{JSON.parse(fs.readFileSync(p,'utf8'))}catch{missing.push(name+'(corrompu)')}
}
if(missing.length){
  console.error('FAIL installation npm incomplète:',missing.join(', '));
  console.error('Action: supprimer node_modules puis lancer npm ci --no-audit --no-fund');
  process.exit(1)
}
console.log(`PASS ${critical.length} dépendances critiques présentes`);
