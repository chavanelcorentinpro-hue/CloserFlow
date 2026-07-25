import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const gradle=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
const cap=fs.readFileSync(path.join(root,'capacitor.config.ts'),'utf8');

const issues=[];
const name=(gradle.match(/versionName\s+"([^"]+)"/)||[])[1];
const code=Number((gradle.match(/versionCode\s+(\d+)/)||[])[1]);
const p=pkg.version.split('.').map(Number);
const expected=p[0]*10000+p[1]*100+p[2];

if(name!==pkg.version) issues.push(`versionName ${name} != ${pkg.version}`);
if(code!==expected) issues.push(`versionCode ${code} != ${expected}`);
if(!cap.includes("appId: 'fr.closerflow.app'")) issues.push('application id inattendu');
if(cap.includes('allowMixedContent: true')) issues.push('allowMixedContent=true');
if(fs.existsSync(path.join(root,'android/local.properties'))) issues.push('local.properties embarqué');

const manifest=path.join(root,'android/app/src/main/AndroidManifest.xml');
if(fs.existsSync(manifest)){
  const m=fs.readFileSync(manifest,'utf8');
  if(!m.includes('android:usesCleartextTraffic="false"')) {
    console.log('WARN  AndroidManifest.xml ne force pas usesCleartextTraffic=false');
  } else {
    console.log('OK    cleartext traffic disabled');
  }
}

if(issues.length){
  for(const i of issues) console.error('FAIL ',i);
  process.exit(1);
}
console.log(`PASS Android release metadata ${pkg.version} (${expected})`);
