import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const apkDir=path.join(root,'android/app/build/outputs/apk/debug');
const releaseDir=path.join(root,'release');
fs.mkdirSync(releaseDir,{recursive:true});

const files=[];
if(fs.existsSync(apkDir)){
  for(const name of fs.readdirSync(apkDir)){
    if(!name.endsWith('.apk')) continue;
    const p=path.join(apkDir,name);
    const data=fs.readFileSync(p);
    files.push({
      name,
      size_bytes:data.length,
      sha256:crypto.createHash('sha256').update(data).digest('hex')
    });
  }
}
const manifest={
  app:'CloserFlow',
  version:pkg.version,
  generated_at:new Date().toISOString(),
  apk_files:files,
  apk_generated:files.length>0
};
fs.writeFileSync(path.join(releaseDir,'release-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
if(!files.length) process.exitCode=2;
