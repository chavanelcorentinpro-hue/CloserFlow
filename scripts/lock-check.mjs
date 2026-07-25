import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const lockPath=path.join(root,'package-lock.json');
if(!fs.existsSync(lockPath)){console.error('FAIL package-lock.json absent');process.exit(1)}
let lock;
try{lock=JSON.parse(fs.readFileSync(lockPath,'utf8'))}catch{console.error('FAIL package-lock.json invalide');process.exit(1)}

const rootPkg=lock.packages?.[''];
if(!rootPkg){console.error('FAIL entrée racine packages[""] absente du lock');process.exit(1)}
const issues=[];
if(rootPkg.version && rootPkg.version!==pkg.version) issues.push(`version lock ${rootPkg.version} != package ${pkg.version}`);

for(const section of ['dependencies','devDependencies']){
  const a=pkg[section]||{}, b=rootPkg[section]||{};
  for(const [name,ver] of Object.entries(a)){
    if(!(name in b)) issues.push(`${section}: ${name} absent du lock racine`);
    else if(b[name]!==ver) issues.push(`${section}: ${name} ${b[name]} != ${ver}`);
  }
}
if(issues.length){for(const i of issues)console.error('FAIL',i);process.exit(1)}
console.log(`PASS lock cohérent avec package.json ${pkg.version}`);
