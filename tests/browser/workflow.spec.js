import {test,expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const evidence=path.resolve('../sitepilot-qa/v1.1');
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVqQAAAAASUVORK5CYII=','base64');
test.beforeEach(async({page})=>{await fs.mkdir(evidence,{recursive:true});await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({contentType:'image/png',body:pixel}));await page.goto('/');});
async function create(page,name='Downtown coffee'){await page.getByLabel('Project name (optional)',{exact:true}).fill(name);await page.getByRole('button',{name:'Create project',exact:true}).click();await expect(page.getByRole('heading',{name:'Explore your next location'})).toBeVisible();await expect(page.getByLabel('Search addresses or places')).toBeEnabled();}
async function addCoordinates(page,index){await page.getByLabel('Search addresses or places').fill(`${39.75+index*.002}, ${-104.99+index*.002}`);await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('.search-results button').first().click();await page.getByRole('button',{name:'Add selected location'}).click();await page.getByLabel('Your site label').fill(`Candidate ${index+1}`);await page.getByRole('dialog').getByRole('button',{name:'Add candidate',exact:true}).click();}

test('No-key map, selection, five saved pins, dragging, backup and reopen',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('.leaflet-container')).toBeVisible();await expect(page.getByRole('link',{name:'OpenStreetMap contributors',exact:true})).toBeVisible();
  await create(page);for(let i=0;i<5;i++)await addCoordinates(page,i);
  await expect(page.getByRole('button',{name:'Add candidate location'})).toBeDisabled();
  await page.getByRole('button',{name:'Fit all candidate locations'}).click();await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:/01 Candidate 1/}).click();await page.locator('.leaflet-site-marker').first().scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('sitepilot.projects.v1'))[0].sites[0].point);
  const marker=page.locator('.leaflet-site-marker').first(),box=await marker.boundingBox();await page.mouse.move(box.x+16,box.y+16);await page.mouse.down();await page.mouse.move(box.x+45,box.y+32,{steps:10});await page.mouse.up();
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sitepilot.projects.v1'))[0].sites[0].point.lat)).not.toBe(before.lat);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sitepilot.projects.v1'))[0]);expect(saved.sites).toHaveLength(5);expect(saved.sites.every(s=>s.point?.lat&&s.point?.lng)).toBeTruthy();
  const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Save project'}).click();const backup=await promise;await backup.saveAs(path.join(evidence,'pins.sitepilot.json'));
  await page.reload();await page.getByRole('button',{name:'Map Explorer',exact:true}).click();await expect(page.locator('.leaflet-site-marker')).toHaveCount(5);
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('sitepilot.projects.v1'))[0]);expect(restored.sites.map(s=>s.point)).toEqual(saved.sites.map(s=>s.point));
  await page.getByRole('button',{name:'Compare Locations',exact:true}).click();await expect(page.getByText('More comparable evidence is needed.')).toBeVisible();await expect(page.locator('.score-table-row')).toContainText('Unavailable');
  await page.locator('input[type=file]').setInputFiles(path.join(evidence,'pins.sitepilot.json'));await expect(page.locator('.leaflet-site-marker')).toHaveCount(5);expect(errors).toEqual([]);
});

test('Complete example: financial accuracy, scenarios, AHP, report and persistence',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.getByRole('button',{name:'Try a worked example'}).click();
  await expect(page.locator('.recharts-surface').first()).toBeVisible();await expect(page.locator('.toast')).toBeHidden({timeout:7000});await page.screenshot({path:path.join(evidence,'compare-desktop.png'),fullPage:true});
  const initial=await page.locator('.score-table-row').textContent();await page.getByRole('slider',{name:'Assumed sales change'}).fill('-50');await expect(page.locator('.score-table-row')).not.toHaveText(initial);await page.getByRole('button',{name:'Reset scenario'}).click();await expect(page.locator('.score-table-row')).toHaveText(initial);
  await page.getByRole('button',{name:'Market Street',exact:true}).click();await expect(page.getByRole('tab',{name:'2 Market Street'})).toHaveAttribute('aria-selected','true');
  for(const [label,value] of [['Monthly rent','2000'],['Other monthly fixed costs','4000'],['Contribution margin (%)','60'],['Average transaction value','10'],['Trading days per month','30'],['Assumed transactions per day','50']])await page.getByLabel(label,{exact:true}).fill(value);
  await expect(page.locator('.financial-results').getByRole('heading',{name:'$10,000'})).toBeVisible();await expect(page.locator('.financial-results').getByText('$3,000.00',{exact:true})).toBeVisible();
  await page.getByLabel('Monthly rent',{exact:true}).fill('-1');await expect(page.getByText(/Rent cannot be negative/)).toBeVisible();await page.getByLabel('Monthly rent',{exact:true}).fill('2000');
  await page.getByLabel('Assumed transactions per day',{exact:true}).fill('');await expect(page.locator('.financial-row').filter({hasText:'Scenario operating profit'})).toContainText('Not entered');await page.getByLabel('Assumed transactions per day',{exact:true}).fill('50');
  await page.locator('.score-row summary').first().click();await expect(page.getByText(/Contribution to the available-evidence score:/).first()).toBeVisible();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Decision model'}).click();await page.getByRole('button',{name:'Use AHP pairwise comparisons'}).click();await expect(page.getByText(/Consistency ratio: 0./)).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Decision Report',exact:true}).click();await expect(page.getByRole('heading',{name:'Your decision, explained.'})).toBeVisible();
  const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Download report',exact:true}).click();const report=await promise;await report.saveAs(path.join(evidence,'report.html'));const html=await fs.readFile(path.join(evidence,'report.html'),'utf8');expect(html).toContain('ILLUSTRATIVE EXAMPLE');expect(html).toContain('Demand–competition fit');
  const reportPage=await page.context().newPage();await reportPage.goto(pathToFileURL(path.join(evidence,'report.html')).href);await expect(reportPage.getByRole('heading',{name:'Decision summary'})).toBeVisible();await reportPage.emulateMedia({media:'print'});await expect(reportPage.getByRole('button',{name:'Print / Save PDF'})).toBeHidden();await reportPage.close();
  const csvPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV'}).click();expect((await csvPromise).suggestedFilename()).toMatch(/\.csv$/);
  await page.reload();await page.getByRole('button',{name:'Location Analysis',exact:true}).click();await page.getByRole('tab',{name:'2 Market Street'}).click();await expect(page.getByLabel('Monthly rent',{exact:true})).toHaveValue('2000');expect(errors).toEqual([]);
});

test('Connection tests, open-data gaps, stale results and network failure',async({page})=>{
  await create(page);await addCoordinates(page,0);await page.getByRole('button',{name:'Data connections'}).click();
  await page.route('**/api/open/test?**',r=>r.fulfill({json:{ok:true,service:'OpenStreetMap test fixture'}}));
  await page.getByLabel('Enable manual open-data neighborhood searches').check();await page.getByRole('button',{name:'Test connection',exact:true}).click();await expect(page.getByText(/Connected to OpenStreetMap test fixture/)).toBeVisible();await page.getByRole('button',{name:'Apply settings'}).click();
  await page.route('**/api/open/nearby?**',r=>{const u=new URL(r.request().url());return r.fulfill({json:{provider:'osm',at:new Date().toISOString(),point:{lat:+u.searchParams.get('lat'),lng:+u.searchParams.get('lng'),crs:'WGS84',origin:'osm'},radius:800,business:'coffee',limited:false,counts:{competitors:0,anchors:0,transit:0,parking:0},items:[]}});});
  await page.getByRole('button',{name:'Retrieve nearby data'}).click();await expect(page.locator('.live-stat strong')).toHaveText(['0','0','0','0']);await page.getByRole('button',{name:'Analyze selected location'}).click();await expect(page.getByLabel('Business surroundings used for scoring')).toHaveValue('open');await expect(page.locator('.score-row').filter({hasText:'Demand–competition fit'})).toContainText('Missing');
  await page.getByRole('button',{name:'Map Explorer',exact:true}).click();await page.getByLabel('Catchment radius').selectOption('1000');await expect(page.getByText(/Stale or no longer matches/)).toBeVisible();
  await page.route('**/api/open/nearby?**',r=>r.fulfill({status:503,json:{error:'Network unavailable. Retry later.'}}));await page.getByRole('button',{name:'Retrieve nearby data'}).click();await expect(page.getByRole('alert')).toContainText('Network unavailable');
  await page.getByLabel('Map provider',{exact:true}).selectOption('google');await expect(page.getByText(/Add a Google Maps browser API key/)).toBeVisible();await page.getByLabel('Map provider',{exact:true}).selectOption('amap');await expect(page.getByText(/Add an Amap Web JS key/)).toBeVisible();
  await page.getByLabel('Map provider',{exact:true}).selectOption('open');await expect(page.locator('.leaflet-container')).toBeVisible();
});

test('Business-specific fields, invalid import, mobile navigation and layout',async({page})=>{
  await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});await expect(page.getByRole('status')).toContainText('Import failed');
  await page.getByRole('button',{name:'Fruit shop',exact:true}).click();await create(page,'Fruit project');await addCoordinates(page,0);await page.getByRole('button',{name:'Analyze selected location'}).click();await expect(page.getByLabel('Documented occupied households in the catchment')).toBeVisible();await expect(page.getByLabel('Suitable cold storage verified')).toBeVisible();await expect(page.getByLabel('Legal produce unloading access verified')).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:path.join(evidence,'analysis-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('button',{name:'Map Explorer',exact:true}).click();await expect(page.locator('.leaflet-container')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('button',{name:'Home',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
