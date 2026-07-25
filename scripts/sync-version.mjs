import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const parts = version.split('.').map(Number);
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  console.error(`Invalid package version: ${version}`);
  process.exit(1);
}
const versionCode = parts[0] * 10000 + parts[1] * 100 + parts[2];
const gradlePath = path.join(root, 'android/app/build.gradle');

let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
fs.writeFileSync(gradlePath, gradle);

console.log(`Android version synchronized: ${version} (${versionCode})`);
