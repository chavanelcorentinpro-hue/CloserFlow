import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
const root=process.cwd(),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function run(cmd,args=[]){try{const r=cp.spawnSync(cmd,args,{encoding:'utf8'});return {code:r.status,output:((r.stdout||'')+(r.stderr||'')).trim().slice(0,1200)}}catch(e){return {code:null,output:String(e)}}}
const report={version:pkg.version,platform:process.platform,arch:process.arch,tools:{node:run('node',['--version']),npm:run('npm',['--version']),java:run('java',['-version']),gradle:run('./android/gradlew',['--version'])},files:{packageLock:fs.existsSync(path.join(root,'package-lock.json')),nodeModules:fs.existsSync(path.join(root,'node_modules')),android:fs.existsSync(path.join(root,'android')),dist:fs.existsSync(path.join(root,'dist'))}};
console.log(JSON.stringify(report,null,2));
