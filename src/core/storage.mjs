import {BUSINESSES,criteriaFor,PROFILES,newProject,newSite,present} from './model.mjs';
export const STORAGE_KEY='sitepilot.projects.v1';
const str=(x,max=300)=>typeof x==='string'?x.slice(0,max):'';
const num=(x,min,max)=>present(x)&&x>=min&&x<=max?x:null;
export function ownedPoint(pt){return pt&&['user','osm'].includes(pt.origin)&&['WGS84','GCJ02'].includes(pt.crs)&&!(pt.origin==='osm'&&pt.crs!=='WGS84')&&num(pt.lat,-90,90)!==null&&num(pt.lng,-180,180)!==null?{lat:pt.lat,lng:pt.lng,crs:pt.crs,origin:pt.origin,...(pt.origin==='osm'?{attribution:'© OpenStreetMap contributors',license:'ODbL 1.0'}:{})}:null;}
export function googleCache(raw,ref,now=Date.now()) {const a=Date.parse(raw?.at),expires=Date.parse(raw?.expiresAt),pt=raw?.point;return ref?.provider==='google'&&pt?.origin==='google'&&pt.crs==='WGS84'&&num(pt.lat,-90,90)!==null&&num(pt.lng,-180,180)!==null&&Number.isFinite(a)&&a<=now&&expires>now&&expires<=a+30*86400000?{point:{lat:pt.lat,lng:pt.lng,crs:'WGS84',origin:'google'},at:new Date(a).toISOString(),expiresAt:new Date(expires).toISOString()}:null;}
export function pointFor(site,provider){if(!site)return null;if(provider==='google')return googleCache(site.googleLocation,site.placeRef)?.point||site.googleSessionPoint||(site.point?.crs==='WGS84'?ownedPoint(site.point):null);if(provider==='amap')return site.amapLocation||(site.point?.crs==='GCJ02'?ownedPoint(site.point):null);return site.point?.crs==='WGS84'?ownedPoint(site.point):null;}
export function locationUpdate(point,reference){if(['osm','user'].includes(point.origin))return{point:ownedPoint(point),openAnalysis:null};if(point.origin==='amap')return{amapLocation:point};const at=new Date().toISOString();return reference?.id?{placeRef:{provider:'google',id:reference.id},googleLocation:{point,at,expiresAt:new Date(Date.now()+30*86400000).toISOString()},googleSessionPoint:null}:{googleSessionPoint:point};}
export function portableProject(p){return validateProject({...p,sites:p.sites.map(s=>({...s,googleLocation:null,googleSessionPoint:null,amapLocation:null}))});}
export function persistentProject(p){return validateProject(p);}
export function validateProject(raw){
  if(!raw||![1,2].includes(raw.version)||!Object.hasOwn(BUSINESSES,raw.type)||!Array.isArray(raw.sites)||raw.sites.length>5||!str(raw.name).trim())throw new Error('Not a valid SitePilot project (maximum five candidates).');
  const p=newProject(str(raw.name,120),raw.type,['USD','CNY','EUR','GBP','CAD','AUD','JPY','INR'].includes(raw.currency)?raw.currency:'USD');
  p.id=str(raw.id,100)||p.id;p.demo=raw.demo===true;p.radius=[300,500,800,1000,1500,2000].includes(raw.radius)?raw.radius:800;p.rentBudget=num(raw.rentBudget,0,1e12);p.customKeyword=str(raw.customKeyword,120);
  p.createdAt=str(raw.createdAt,50)||p.createdAt;p.updatedAt=str(raw.updatedAt,50)||p.updatedAt;
  if(raw.version===2){for(const c of criteriaFor(p.type)){if(num(raw.weights?.[c.id],0,1000)===null)throw new Error('Invalid criterion weights.');p.weights[c.id]=raw.weights[c.id];}if(!Object.values(p.weights).some(w=>w>0))throw new Error('At least one weight must be positive.');}
  p.targets={demand:num(raw.targets?.demand,.1,1e7)??PROFILES[p.type].target,anchors:num(raw.targets?.anchors,1,10000)??PROFILES[p.type].anchorTarget,competitionScale:num(raw.targets?.competitionScale,.1,10000)??8};
  p.migrationNote=raw.version===1?'Upgraded from V1.0. Financial inputs and independent evidence were retained. New business criteria use new defaults. Previously discarded pins cannot be reconstructed; re-pin those candidates.':str(raw.migrationNote,500);
  p.sites=raw.sites.map((r,i)=>{
    if(!r||typeof r!=='object')throw new Error('Invalid candidate.');const s=newSite(str(r.name,120)||`Candidate ${i+1}`);s.id=str(r.id,100)||s.id;s.address=str(r.address,500);s.notes=str(r.notes,5000);s.point=ownedPoint(r.point);
    if(r.placeRef?.provider==='google'&&str(r.placeRef.id,300))s.placeRef={provider:'google',id:str(r.placeRef.id,300)};
    s.googleLocation=googleCache(r.googleLocation,s.placeRef);s.evidenceMode=r.evidenceMode==='open'?'open':'survey';
    const f=r.financial||{};for(const k of ['rent','otherCosts','ticket','dailyOrders','setupCost','cashReserve'])s.financial[k]=num(f[k],0,1e12);s.financial.margin=num(f.margin,0,100);s.financial.days=num(f.days,1,31);
    const e=r.survey||{};for(const k of ['anchors','competitors','nearestTransit','passers','minutes','households','inquiries','researchDays','transit','parking','amenities'])s.survey[k]=num(e[k],0,1e7);
    for(const [k,,kind] of PROFILES[p.type].fields)if(kind==='boolean')s.survey[k]=typeof e[k]==='boolean'?e[k]:null;
    Object.assign(s.survey,{radius:num(e.radius,100,5000)??800,date:str(e.date,10),method:str(e.method,1000),kind:e.kind==='estimate'?'estimate':'observed'});
    const a=r.openAnalysis;
    if(a?.provider==='osm'&&ownedPoint(a.point)&&a.point.crs==='WGS84'&&Object.hasOwn(PROFILES,a.business)&&Number.isFinite(Date.parse(a.at))){s.openAnalysis={provider:'osm',at:str(a.at,40),point:ownedPoint(a.point),business:a.business,radius:num(a.radius,300,2000),limited:a.limited===true,counts:Object.fromEntries(['competitors','anchors','transit','parking'].map(k=>[k,num(a.counts?.[k],0,300)])),license:'ODbL 1.0',attribution:'© OpenStreetMap contributors'};}
    return s;
  });
  if(new Set(p.sites.map(s=>s.id)).size!==p.sites.length)throw new Error('Duplicate candidate identifiers.');return p;
}
export function loadProjects(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(!Array.isArray(data))throw new Error();return{projects:data.map(validateProject),error:null};}catch{return{projects:[],error:'Saved workspace could not be read. Original data is protected. Import a backup or create a project; the original storage will be copied to a recovery backup before saving.'};}}
export function saveProjects(projects){const old=localStorage.getItem(STORAGE_KEY);if(old){try{const data=JSON.parse(old);if(!Array.isArray(data))throw new Error();data.forEach(validateProject);}catch{localStorage.setItem(`${STORAGE_KEY}.recovery.${Date.now()}`,old);}}localStorage.setItem(STORAGE_KEY,JSON.stringify(projects.map(persistentProject)));}
export function download(filename,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function exampleProject(){const p=newProject('Coffee shop · worked example','coffee','USD');p.demo=true;p.rentBudget=2800;p.sites=['Riverside','Market Street','Station Quarter'].map((name,i)=>{const s=newSite(name);s.financial={rent:[2400,3200,2100][i],otherCosts:[6200,6500,6000][i],margin:65,ticket:9,days:26,dailyOrders:[80,85,70][i],setupCost:45000,cashReserve:20000};s.survey={anchors:[7,8,5][i],competitors:[6,10,4][i],nearestTransit:[180,300,90][i],stepFree:true,passers:[135,120,85][i],minutes:30,radius:800,date:new Date().toISOString().slice(0,10),kind:'estimate',method:'Synthetic example only; no real survey or location.'};s.notes='Illustrative inputs for learning the model. Not a real business forecast.';return s;});return p;}
