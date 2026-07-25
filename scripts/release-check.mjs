import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const pkg = JSON.parse(read('package.json'));
const failures = [];
const passes = [];

function pass(msg){passes.push(msg)}
function fail(msg){failures.push(msg)}

for (const f of [
  'src/App.tsx',
  'src/main.tsx',
  'src/context/AppDataContext.tsx',
  'capacitor.config.ts',
  'android/app/build.gradle',
  '.github/workflows/build-android.yml',
  'scripts/production-audit.mjs',
  'scripts/sync-version.mjs'
]) exists(f) ? pass(`exists ${f}`) : fail(`missing ${f}`);

const app = read('src/App.tsx');
const lazyTargets = [...app.matchAll(/import\('\.\/pages\/([^']+)'\)/g)].map(m => m[1]);
for (const target of lazyTargets) {
  exists(`src/pages/${target}.tsx`) ? pass(`lazy page ${target}`) : fail(`missing lazy page ${target}`);
}

const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1]);
const duplicates = [...new Set(routes.filter((x,i,a)=>a.indexOf(x)!==i))];
duplicates.length ? fail(`duplicate routes: ${duplicates.join(', ')}`) : pass('routes unique');

const routeSet = new Set(routes.map(r => '/' + r.replace(/^\/+/, '')));
routeSet.add('/');
const sourceFiles = [];
function walk(dir){
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(item.name)) sourceFiles.push(full);
  }
}
walk(path.join(root,'src'));
const links = [];
for (const file of sourceFiles) {
  const txt = fs.readFileSync(file,'utf8');
  for (const m of txt.matchAll(/\bto=["'`]([^"'`]+)["'`]/g)) links.push({file, to:m[1]});
}
for (const {file,to} of links) {
  if (!to.startsWith('/') || to.includes('${') || to.includes(':')) continue;
  const staticPath = to.split('?')[0];
  if (routeSet.has(staticPath)) continue;
  const dynamicMatch = routes.some(r => {
    const rr = '/' + r.replace(/^\/+/, '');
    if (!rr.includes(':')) return false;
    const base = rr.split('/:')[0];
    return staticPath === base || staticPath.startsWith(base + '/');
  });
  if (!dynamicMatch) fail(`unresolved link ${to} in ${path.relative(root,file)}`);
}

const gradle = read('android/app/build.gradle');
const versionCode = Number((gradle.match(/versionCode\s+(\d+)/)||[])[1]);
const versionName = (gradle.match(/versionName\s+"([^"]+)"/)||[])[1];
const parts = pkg.version.split('.').map(Number);
const expectedCode = parts[0]*10000 + parts[1]*100 + parts[2];
versionName === pkg.version ? pass('Android versionName synced') : fail(`Android versionName ${versionName} != ${pkg.version}`);
versionCode === expectedCode ? pass('Android versionCode synced') : fail(`Android versionCode ${versionCode} != ${expectedCode}`);

const workflow = read('.github/workflows/build-android.yml');
workflow.includes('package.json') ? pass('workflow derives package version') : fail('workflow does not derive package version');
(workflow.includes('CloserFlow-${APP_VERSION}-debug.apk') || workflow.includes('CloserFlow-${APP_VERSION}-beta.apk')) ? pass('workflow artifact is version-dynamic') : fail('workflow artifact filename is stale/static');

const cap = read('capacitor.config.ts');
cap.includes("appId: 'fr.closerflow.app'") ? pass('stable Android application id') : fail('unexpected Android app id');
cap.includes('allowMixedContent: false') ? pass('mixed content disabled') : fail('mixed content enabled/missing');

console.log(`CloserFlow ${pkg.version} release check`);
for (const p of passes) console.log('OK  ', p);
if (failures.length) {
  for (const f of failures) console.error('FAIL', f);
  console.error(`FAILED: ${failures.length} issue(s), ${passes.length} checks passed`);
  process.exit(1);
}
console.log(`PASS: ${passes.length} checks`);
