import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT=process.cwd();
const skip=new Set(['node_modules','.git','dist','build','.gradle']);
const patterns=[
  ['Private key',/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['AWS access key',/AKIA[0-9A-Z]{16}/],
  ['Stripe live secret',/sk_live_[A-Za-z0-9]{16,}/],
  ['GitHub token',/gh[pousr]_[A-Za-z0-9]{20,}/],
  ['OpenAI secret',/sk-(?:proj-)?[A-Za-z0-9_-]{24,}/],
  ['JWT-like hardcoded token',/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/]
];

async function walk(dir){
  const out=[];
  for(const ent of await readdir(dir,{withFileTypes:true})){
    if(skip.has(ent.name)) continue;
    const p=join(dir,ent.name);
    if(ent.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const findings=[];
for(const file of await walk(ROOT)){
  let txt='';
  try{txt=await readFile(file,'utf8')}catch{continue}
  for(const [name,re] of patterns){
    if(re.test(txt)) findings.push(`${name}: ${relative(ROOT,file)}`);
  }
}
if(findings.length){
  console.error('SECURITY SCAN FAIL');
  findings.forEach(x=>console.error('-',x));
  process.exit(1);
}
console.log('SECURITY SCAN PASS');
