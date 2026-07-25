import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';

const root=process.cwd(), out=[], fail=[];
const ok=m=>out.push(['OK',m]), warn=m=>out.push(['WARN',m]), bad=m=>{out.push(['FAIL',m]);fail.push(m)};
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
ok(`package version ${pkg.version}`);

function run(cmd,args=['--version']) {
  try { const r=childProcess.spawnSync(cmd,args,{encoding:'utf8'}); if(r.status===0)return (r.stdout||r.stderr).trim(); } catch {}
  return null;
}
run('node')?ok(`Node ${run('node')}`):bad('Node introuvable');
run('npm')?ok(`npm ${run('npm')}`):bad('npm introuvable');
run('java',['-version'])?ok('Java détecté'):warn('Java non détecté');
fs.existsSync(path.join(root,'android/gradlew'))?ok('Gradle wrapper présent'):bad('Gradle wrapper absent');
fs.existsSync(path.join(root,'capacitor.config.ts'))?ok('Capacitor config présente'):bad('Capacitor config absente');
fs.existsSync(path.join(root,'package-lock.json'))?ok('package-lock présent'):bad('package-lock absent');
fs.existsSync(path.join(root,'android/local.properties'))?warn('local.properties présent (machine-local)'):ok('Pas de local.properties embarqué');

const nm=path.join(root,'node_modules');
if(!fs.existsSync(nm)) warn('node_modules absent — npm ci requis');
else {
  const critical=['typescript/package.json','vite/package.json','react/package.json','react-dom/package.json','@types/node/package.json','@types/react/package.json','@types/react-dom/package.json'];
  const missing=critical.filter(p=>!fs.existsSync(path.join(nm,p)));
  missing.length?bad(`node_modules incomplet: ${missing.join(', ')}`):ok('node_modules critique complet');
}
console.log(`CloserFlow ${pkg.version} doctor`);
for(const [s,m] of out)console.log(`${s.padEnd(5)} ${m}`);
if(fail.length)process.exit(1);
