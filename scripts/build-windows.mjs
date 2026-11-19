import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='win32')throw new Error('The portable launcher build requires Windows x64.');
const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid version.');
const targets=['windows-x64','source'].map(s=>path.resolve(root,'releases',`SitePilot-${version}-${s}`));
for(const target of targets){if(!target.startsWith(root+path.sep))throw new Error('Release path outside project.');for(const file of [target,target+'.zip']){try{await fs.stat(file);if(file===target&&process.argv.includes('--resume'))continue;throw new Error(`Release already exists: ${file}. Use a clean source extraction or a new version.`);}catch(e){if(e.code!=='ENOENT')throw e;}}}
function run(file,args,options={}){const r=spawnSync(file,args,{cwd:root,stdio:'inherit',windowsHide:true,...options});if(r.error)throw r.error;if(r.status!==0)throw new Error(`${path.basename(file)} failed (${r.status}).`);}
if(!process.argv.includes('--skip-build'))run('npm.cmd',['run','build'],{shell:true});
run(process.execPath,['scripts/licenses.mjs']);
const compiler=path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319','csc.exe');
if(!process.argv.includes('--skip-launcher'))run(compiler,['/nologo','/target:winexe','/platform:anycpu','/win32icon:app.ico','/out:SitePilot.exe','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','.\\launcher\\SitePilot.cs']);
await fs.mkdir(path.join(root,'runtime'),{recursive:true});
try{await fs.stat(path.join(root,'runtime','node.exe'));}catch{await fs.copyFile(process.execPath,path.join(root,'runtime','node.exe'));}
for(const file of ['runtime/LICENSE-node.txt','dist/index.html','Getting Started.html','src/core/profiles.mjs'])await fs.access(path.join(root,file));
const sourceItems=['app.ico','server.mjs','open-services.mjs','Getting Started.html','README.md','CHANGELOG.md','THIRD-PARTY-NOTICES.txt','package.json','package-lock.json','index.html','vite.config.js','playwright.config.js','src','public','launcher','scripts','tests','docs'];
for(const target of targets){await fs.mkdir(target,{recursive:true});for(const file of sourceItems)await fs.cp(path.join(root,file),path.join(target,file),{recursive:true});}
for(const file of ['SitePilot.exe','dist'])await fs.cp(path.join(root,file),path.join(targets[0],file),{recursive:true});
await fs.mkdir(path.join(targets[0],'runtime'),{recursive:true});for(const file of ['node.exe','LICENSE-node.txt'])await fs.copyFile(path.join(root,'runtime',file),path.join(targets[0],'runtime',file));
await fs.mkdir(path.join(targets[1],'runtime'),{recursive:true});await fs.copyFile(path.join(root,'runtime','LICENSE-node.txt'),path.join(targets[1],'runtime','LICENSE-node.txt'));
const powershell=path.join(process.env.WINDIR,'System32','WindowsPowerShell','v1.0','powershell.exe');
const quote=s=>`'${s.replaceAll("'","''")}'`;
for(const target of targets){const zip=target+'.zip';run(powershell,['-NoProfile','-NonInteractive','-Command',`$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(target)}, ${quote(zip)}, [System.IO.Compression.CompressionLevel]::Optimal, $true)`]);const hash=createHash('sha256').update(await fs.readFile(zip)).digest('hex');await fs.writeFile(zip+'.sha256',`${hash}  ${path.basename(zip)}\n`);console.log(`Created: ${zip}`);}
