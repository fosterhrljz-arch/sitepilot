import {BUSINESSES} from '../core/model.mjs';
import {loadScript,timeout,compatible} from './shared.mjs';
let loadedKey;
export async function connectAmap(config,element,onPick){
  if(!config.amapKey?.trim()||!config.amapSecurity?.trim())throw new Error('Add an Amap Web JS key and security code in Settings.');
  if(loadedKey&&loadedKey!==config.amapKey)throw new Error('Amap SDK already uses another key. Reload the app, then enter the new key.');
  const session=await fetch('/api/session').then(r=>{if(!r.ok)throw new Error('Start SitePilot using its launcher to enable the secure Amap proxy.');return r.json();});
  const setup=await fetch('/api/amap-config',{method:'POST',headers:{'Content-Type':'application/json','X-SitePilot-Token':session.token},body:JSON.stringify({securityCode:config.amapSecurity})});
  if(!setup.ok)throw new Error('Could not configure the local Amap security proxy. Restart SitePilot.');
  window._AMapSecurityConfig={serviceHost:`${location.origin}/_AMapService`};
  if(!window.AMap)await loadScript(`https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.amapKey)}&plugin=AMap.PlaceSearch,AMap.Scale,AMap.ToolBar`,'amap-sdk');
  loadedKey=config.amapKey;
  const map=new AMap.Map(element,{center:[116.3974,39.9093],zoom:13,viewMode:'2D',lang:'en'});
  map.addControl(new AMap.Scale());map.addControl(new AMap.ToolBar());
  const handler=e=>onPick({lng:e.lnglat.getLng(),lat:e.lnglat.getLat(),crs:'GCJ02',origin:'amap'});map.on('click',handler);
  const normalize=p=>({id:p.id,name:p.name||'Unnamed place',address:typeof p.address==='string'?p.address:'',point:p.location?{lng:p.location.getLng(),lat:p.location.getLat(),crs:'GCJ02',origin:'amap'}:null,provider:'amap',attributions:[]});
  function request(options,method,args){return timeout(new Promise((resolve,reject)=>{const search=new AMap.PlaceSearch({pageSize:20,pageIndex:1,extensions:'base',...options});search[method](...args,(status,result)=>{if(status==='no_data')return resolve({items:[],total:0});if(status!=='complete')return reject(new Error(`Amap search failed: ${typeof result==='string'?result:(result.info||'unknown error')}. Check key type, security code, whitelist and quota.`));resolve({items:(result.poiList?.pois||[]).map(normalize),total:result.poiList?.count});});}),'Amap search');}
  let overlays=[];
  return {provider:'amap',
    async search(text){return (await request({},'search',[text])).items;},
    async nearby(point,project,kind){
      if(!compatible(point,'amap'))throw new Error('Amap needs GCJ-02 coordinates. Select the location again on Amap; WGS84 is never silently relabeled.');
      const b=BUSINESSES[project.type];const type=kind==='competitors'?b.amap:kind==='transit'?'150500|150700':kind==='parking'?'150900':'060100|060400|090600|160100';
      const keyword=kind==='competitors'?(project.type==='custom'?project.customKeyword:b.keyword):'';
      if(!type&&!keyword)throw new Error('Add your custom competitor keyword in Settings.');
      const r=await request({type},'searchNearBy',[keyword,[point.lng,point.lat],project.radius]);
      return {...r,limit:20,limited:r.total>r.items.length,provider:'amap',at:new Date().toISOString(),query:type||keyword};
    },
    center(point){if(compatible(point,'amap'))map.setZoomAndCenter(15,[point.lng,point.lat]);},
    draw(sites,selected,radius,pois=[]){
      map.remove(overlays);overlays=[];
      sites.forEach((s,i)=>{if(compatible(s.point,'amap'))overlays.push(new AMap.Marker({position:[s.point.lng,s.point.lat],title:s.name,content:`<div class="site-pin">${i+1}</div>`,offset:new AMap.Pixel(-16,-16)}));});
      pois.forEach(p=>{if(p.point)overlays.push(new AMap.Marker({position:[p.point.lng,p.point.lat],title:p.name,content:'<div class="poi-pin"></div>',offset:new AMap.Pixel(-5,-5)}));});
      if(compatible(selected,'amap'))overlays.push(new AMap.Circle({center:[selected.lng,selected.lat],radius,strokeColor:'#127e78',strokeWeight:2,fillColor:'#127e78',fillOpacity:.08,bubble:true}));map.add(overlays);
    },destroy(){map.off('click',handler);map.destroy();},
  };
}
