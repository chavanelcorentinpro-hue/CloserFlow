import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),fail=[],ok=[];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const pkg=JSON.parse(read('package.json'));

pkg.version==='66.0.0'?ok.push('package version 66.0.0'):fail.push(`package version ${pkg.version}`);
for(const f of ['src/App.tsx','capacitor.config.ts','android/app/build.gradle','src/context/AppDataContext.tsx','scripts/sync-version.mjs','scripts/release-check.mjs'])
  fs.existsSync(path.join(root,f))?ok.push(f):fail.push('missing '+f);

const app=read('src/App.tsx');
const imports=[...app.matchAll(/import\('\.\/pages\/([^']+)'\)/g)].map(m=>m[1]);
for(const i of imports){
  if(!fs.existsSync(path.join(root,'src/pages',i+'.tsx')))fail.push('lazy target '+i);
}
const paths=[...app.matchAll(/<Route path="([^"]+)"/g)].map(m=>m[1]);
const dup=paths.filter((x,i,a)=>a.indexOf(x)!==i);
if(dup.length)fail.push('duplicate routes '+[...new Set(dup)].join(','));
else ok.push('routes unique');

const badTokens=['clientInteractions','stockItems','scheduled_at','q.total_ht'];
for(const t of badTokens){
  let found=false;
  for(const f of ['src/pages/DailyCommandV22Page.tsx','src/pages/CapacityPlannerV23Page.tsx'])
    if(fs.existsSync(path.join(root,f)) && read(f).includes(t))found=true;
  found?fail.push('legacy invalid token '+t):ok.push('no '+t);
}

const cap=read('capacitor.config.ts');
cap.includes('allowMixedContent: false')?ok.push('mixed content disabled'):fail.push('mixed content not disabled');
fs.existsSync(path.join(root,'android/local.properties'))?fail.push('android/local.properties must stay local'):ok.push('no machine-local android SDK path');

const gradle=read('android/app/build.gradle');
gradle.includes('versionName "66.0.0"')?ok.push('Android versionName 66.0.0'):fail.push('Android versionName stale');
gradle.includes('versionCode 660000')?ok.push('Android versionCode 660000'):fail.push('Android versionCode stale');

console.log('CloserFlow V66 production audit');
for(const x of ok)console.log('OK ',x);
if(fail.length){
  for(const x of fail)console.error('FAIL',x);
  process.exit(1);
}
console.log(`PASS ${ok.length} checks`);
