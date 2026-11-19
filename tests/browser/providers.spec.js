import {test,expect} from '@playwright/test';
import {googleFixture,amapFixture} from './provider-fixtures';
for(const provider of ['google','amap'])test(`${provider}: tested Settings connection, discovery isolation and storage lifecycle`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
  await page.route(provider==='google'?'https://maps.googleapis.com/maps/api/js?**':'https://webapi.amap.com/maps?**',route=>route.fulfill({status:200,contentType:'application/javascript',body:provider==='google'?googleFixture:amapFixture}));
  await page.goto('/');await page.getByRole('button',{name:'Create project',exact:true}).click();await page.getByRole('button',{name:'Data connections'}).click();
  await page.getByRole('button',{name:provider==='google'?'Google Maps':'Amap',exact:true}).click();await page.getByLabel('Default map provider').selectOption(provider);
  await page.getByLabel(provider==='google'?'Google Maps browser API key':'Amap Web JS API key',{exact:true}).fill('TEST-FIXTURE-KEY-NOT-REAL');if(provider==='amap')await page.getByLabel('Amap security code (jscode)',{exact:true}).fill('TEST-FIXTURE-SECURITY');
  await page.getByRole('button',{name:'Test connection',exact:true}).click();await expect(page.getByText(/Map SDK and place search responded successfully/)).toBeVisible();await page.getByRole('button',{name:'Apply settings'}).click();
  await page.getByLabel('Search addresses or places').fill('Fixture query');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.locator('.search-results')).toContainText('Synthetic place 1');await page.locator('.search-results button').first().click();await page.getByRole('button',{name:'Add selected location'}).click();await page.getByLabel('Your site label').fill('Independent candidate label');await page.getByRole('dialog').getByRole('button',{name:'Add candidate',exact:true}).click();
  await page.getByRole('button',{name:'Retrieve nearby data'}).click();await expect(page.locator('.poi-list')).toContainText('Synthetic place');await expect(page.getByText(/Restricted POI content is not saved/)).toBeVisible();
  const saved=await page.evaluate(()=>localStorage.getItem('sitepilot.projects.v1'));expect(saved).not.toContain('TEST-FIXTURE');expect(saved).not.toContain('Synthetic place');expect(saved).not.toContain('liveAnalysis');
  const p=JSON.parse(saved)[0];if(provider==='google'){expect(p.sites[0].googleLocation.point.lat).toBeTruthy();expect(p.sites[0].placeRef.id).toBe('fixture-1');}else expect(p.sites[0].amapLocation).toBeUndefined();
  await page.getByLabel('Map provider',{exact:true}).selectOption('open');await expect(page.locator('.leaflet-site-marker')).toHaveCount(0);await expect(page.locator('.poi-list')).toHaveCount(0);
  await page.getByRole('button',{name:'Analyze selected location'}).click();await expect(page.locator('.score-row').filter({hasText:'Demand–competition fit'})).toContainText('Missing');
  await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:provider==='google'?'Google Maps':'Amap',exact:true}).click();await expect(page.getByLabel(provider==='google'?'Google Maps browser API key':'Amap Web JS API key',{exact:true})).toHaveValue('');expect(errors).toEqual([]);
});
