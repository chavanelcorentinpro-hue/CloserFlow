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
 'src/pages/MorePage.tsx',
 'src/pages/DataHealthV33Page.tsx',
 'src/pages/CloudSyncPage.tsx',
 'src/pages/TeamWorkspaceV35Page.tsx'
];
for(const f of required) exists(f)?pass(f):fail('missing '+f);

const app=read('src/App.tsx');
for(const route of ['clients','quotes','invoices','missions','more','data-health-v33','cloud','team-workspace-v35']){
  app.includes(`path="${route}"`)?pass('route '+route):fail('missing route '+route);
}


const more=read('src/pages/MorePage.tsx');
for(const icon of ['PiggyBank','Zap','DatabaseZap']){
  const importBlock=(more.match(/import \{([^}]+)\} from 'lucide-react';/s)||[])[1]||'';
  importBlock.includes(icon)?pass('MorePage icon '+icon):fail('MorePage missing lucide import '+icon);
}


const cloud=read('src/pages/CloudSyncPage.tsx',
 'src/pages/TeamWorkspaceV35Page.tsx');
for(const token of ['saveRestorePoint','registerDevice','peekBackup','acceptPulledRevision']){
  cloud.includes(token)?pass('Cloud V34 '+token):fail('Cloud V34 missing '+token);
}


const teamV35=read('src/pages/TeamWorkspaceV35Page.tsx');
for(const token of ['/api/approvals','/api/invitations','/api/saas/audit']){
  teamV35.includes(token)?pass('Team V35 '+token):fail('Team V35 missing '+token);
}
const serverV35=read('server/index.mjs');
for(const token of ['/api/approvals','approval.created','approval.${decision}','approvals.json']){
  serverV35.includes(token)?pass('Server V35 '+token):fail('Server V35 missing '+token);
}

const main=read('src/main.tsx');
main.includes('ErrorBoundary')?pass('global ErrorBoundary'):fail('ErrorBoundary absent');

const cap=read('capacitor.config.ts');
cap.includes("appId: 'fr.closerflow.app'")?pass('stable appId'):fail('unexpected appId');
cap.includes('allowMixedContent: false')?pass('mixed content disabled'):fail('mixed content not disabled');

const gradle=read('android/app/build.gradle');
gradle.includes('versionName "56.0.0"')?pass('Android versionName'):fail('Android versionName mismatch');
gradle.includes('versionCode 560000')?pass('Android versionCode'):fail('Android versionCode mismatch');

const manifest='android/app/src/main/AndroidManifest.xml';
if(exists(manifest)){
  const m=read(manifest);
  m.includes('android:usesCleartextTraffic="false"')?pass('cleartext disabled'):fail('cleartext not disabled');
}

console.log(`CloserFlow V56 static smoke test`);
for(const x of ok)console.log('OK  ',x);
if(failures.length){
  for(const x of failures)console.error('FAIL',x);
  process.exit(1);
}
console.log(`PASS ${ok.length} smoke checks`);
