// Manual documentation capture. Opens two normal map views, without tile prefetch or automated map pans.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {newProject,newSite} from '../src/core/model.mjs';
import {exampleProject} from '../src/core/storage.mjs';
const out=new URL('../docs/screenshots/',import.meta.url);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:false});
try{
 const context=await browser.newContext({viewport:{width:1536,height:1024}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:47831');await page.locator('.leaflet-tile-loaded').first().waitFor({timeout:25000});
 await page.waitForFunction(()=>[...document.querySelectorAll('.leaflet-tile')].every(t=>t.complete&&t.naturalWidth>0),{},{timeout:20000});
 await page.screenshot({path:new URL('home.png',out).pathname.slice(1)});console.log('Captured live home map.');
 const p=newProject('Denver · coffee shop shortlist');
 p.sites=[['Union Station area',39.7527,-104.9995],['Wynkoop Street area',39.7517,-104.998],['Wazee Street area',39.7507,-104.9968]].map(([name,lat,lng])=>({...newSite(name),point:{lat,lng,crs:'WGS84',origin:'user'},notes:'Documentation map demonstration only. No claim of retail availability or demand.'}));
 await page.evaluate(p=>localStorage.setItem('sitepilot.projects.v1',JSON.stringify([p])),p);
 // A new page restores the selected project through the same storage path as a normal launch.
 await page.reload();await page.getByRole('button',{name:'Map Explorer',exact:true}).click();
 await page.locator('.leaflet-site-marker').first().waitFor();await page.waitForFunction(()=>document.querySelectorAll('.leaflet-tile-loaded').length>0&&[...document.querySelectorAll('.leaflet-tile')].every(t=>t.complete&&t.naturalWidth>0),{},{timeout:25000});
 await page.screenshot({path:new URL('map-explorer.png',out).pathname.slice(1)});console.log('Captured saved candidate map.');
 await page.getByRole('button',{name:'Data connections'}).click();await page.getByText('Your basic map is ready',{exact:true}).waitFor();await page.screenshot({path:new URL('settings.png',out).pathname.slice(1)});await page.getByRole('button',{name:'Cancel',exact:true}).click();
 // Financial screenshots are explicitly synthetic. No map browsing or POI calls are involved.
 const demo=exampleProject();await page.evaluate(d=>localStorage.setItem('sitepilot.projects.v1',JSON.stringify([d])),demo);
 await page.reload();await page.getByRole('button',{name:'Compare Locations',exact:true}).click();await page.locator('.recharts-surface').first().waitFor();await page.mouse.move(0,0);
 await page.screenshot({path:new URL('comparison.png',out).pathname.slice(1),fullPage:true});
 await page.getByRole('button',{name:'Location Analysis',exact:true}).click();await page.getByLabel('Monthly rent',{exact:true}).waitFor();await page.screenshot({path:new URL('analysis.png',out).pathname.slice(1)});
 await page.getByRole('button',{name:'Decision Report',exact:true}).click();await page.locator('.recharts-surface').first().waitFor();await page.screenshot({path:new URL('report.png',out).pathname.slice(1),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL('report-mobile.png',out).pathname.slice(1)});
 console.log(JSON.stringify({screenshots:7,pageErrors:errors}));
}finally{await browser.close();}
