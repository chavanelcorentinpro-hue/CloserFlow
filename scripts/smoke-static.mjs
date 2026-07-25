import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const exists=f=>fs.existsSync(path.join(root,f));
const failures=[], ok=[];
const pass=m=>ok.push(m), fail=m=>failures.push(m);

const required=[
 'src/main.tsx',
 'src/App.tsx',
 'src/context/AppDataContext.tsx',
 'src/pages/ClientsPage.tsx',
 'src/pages/QuotesPage.tsx',
 'src/pages/InvoicesPage.tsx',
 'src/pages/MissionsPage.tsx',
 'src/pages/MorePage.tsx'
];
for(const f of required) exists(f)?pass(f):fail('missing '+f);

const app=read('src/App.tsx');
for(const route of ['clients','quotes','invoices','missions','more']){
  app.includes(`path="${route}"`)?pass('route '+route):fail('missing route '+route);
}

const main=read('src/main.tsx');
main.includes('ErrorBoundary')?pass('global ErrorBoundary'):fail('ErrorBoundary absent');

const cap=read('capacitor.config.ts');
cap.includes("appId: 'fr.closerflow.app'")?pass('stable appId'):fail('unexpected appId');
cap.includes('allowMixedContent: false')?pass('mixed content disabled'):fail('mixed content not disabled');

const gradle=read('android/app/build.gradle');
gradle.includes('versionName "32.0.0"')?pass('Android versionName'):fail('Android versionName mismatch');
gradle.includes('versionCode 320000')?pass('Android versionCode'):fail('Android versionCode mismatch');

const manifest='android/app/src/main/AndroidManifest.xml';
if(exists(manifest)){
  const m=read(manifest);
  m.includes('android:usesCleartextTraffic="false"')?pass('cleartext disabled'):fail('cleartext not disabled');
}

console.log(`CloserFlow V32 static smoke test`);
for(const x of ok)console.log('OK  ',x);
if(failures.length){
  for(const x of failures)console.error('FAIL',x);
  process.exit(1);
}
console.log(`PASS ${ok.length} smoke checks`);
