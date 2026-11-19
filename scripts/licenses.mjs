import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
const notices=['SitePilot 1.1 — third-party notices','The bundled Node.js runtime license is in runtime/LICENSE-node.txt.','The following notices cover production JavaScript dependencies.'];
for(const [dir,entry] of Object.entries(lock.packages||{})){
  if(!dir||entry.dev||entry.optional)continue;
  try{
    const pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
    const files=await readdir(dir),license=files.find(f=>/^licen[sc]e(?:\.md|\.txt)?$/i.test(f));
    notices.push(`\n${'='.repeat(72)}\n${pkg.name} ${pkg.version}\nLicense: ${pkg.license||'See included notice'}\n${license?await readFile(path.join(dir,license),'utf8'):pkg.repository?.url||''}`);
  }catch(error){throw Error(`Could not collect license for ${dir}: ${error.message}`);}
}
await writeFile('THIRD-PARTY-NOTICES.txt',notices.join('\n'),'utf8');
console.log('Production dependency notices collected.');
