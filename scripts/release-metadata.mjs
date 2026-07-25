import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const outDir=path.join(root,'release');
fs.mkdirSync(outDir,{recursive:true});

const metadata={
  app:'CloserFlow',
  version:pkg.version,
  channel:'beta',
  android:{
    applicationId:'fr.closerflow.app',
    versionCode:320000
  },
  build:{
    requires:['npm ci','typecheck','vite build','capacitor sync','gradle assembleDebug'],
    generatedAt:new Date().toISOString()
  },
  update:{
    strategy:'manual-beta',
    notesFile:'RELEASE-NOTES-BETA.md'
  }
};
fs.writeFileSync(path.join(outDir,'release-metadata.json'),JSON.stringify(metadata,null,2));
console.log(JSON.stringify(metadata,null,2));
