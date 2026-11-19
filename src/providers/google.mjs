import {BUSINESSES} from '../core/model.mjs';
import {loadScript,timeout,compatible} from './shared.mjs';
let loadedKey;
export async function connectGoogle(config,element,onPick,onFailure){
  if(!config.googleKey?.trim())throw new Error('Add a Google Maps browser API key in Settings.');
  if(loadedKey&&loadedKey!==config.googleKey)throw new Error('Google SDK already uses another key. Reload the app, then enter the new key.');
  window.gm_authFailure=()=>onFailure('Google rejected the key. Verify billing, Maps JavaScript API, Places API (New), and HTTP referrer restrictions.');
  if(!window.google?.maps?.importLibrary){await timeout(new Promise((resolve,reject)=>{window.__sitepilotGoogleReady=resolve;loadScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.googleKey)}&v=quarterly&language=en&loading=async&libraries=places,marker&callback=__sitepilotGoogleReady`,'google-sdk').catch(reject);}), 'Google Maps initialization');}
  loadedKey=config.googleKey;
  const [{Map,Circle},{AdvancedMarkerElement},{Place,SearchNearbyRankPreference}]=await timeout(Promise.all([google.maps.importLibrary('maps'),google.maps.importLibrary('marker'),google.maps.importLibrary('places')]),'Google libraries');
  const map=new Map(element,{center:{lat:39.7392,lng:-104.9903},zoom:13,mapId:config.googleMapId||'DEMO_MAP_ID',mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:'cooperative'});
  const listener=map.addListener('click',e=>{if(e.latLng)onPick({lat:e.latLng.lat(),lng:e.latLng.lng(),crs:'WGS84',origin:'google'});});
  let overlays=[];
  const normalize=p=>({id:p.id,name:p.displayName||'Unnamed place',address:p.formattedAddress||'',point:p.location?{lat:p.location.lat(),lng:p.location.lng(),crs:'WGS84',origin:'google'}:null,provider:'google',attributions:p.attributions||[]});
  const fields=['id','displayName','formattedAddress','location','attributions'];
  return {
    provider:'google',
    async search(text){const r=await timeout(Place.searchByText({textQuery:text,fields,maxResultCount:10,language:'en'}),'Google search');return r.places.map(normalize);},
    async restore(id){const place=new Place({id});await timeout(place.fetchFields({fields}),'Restore location');return normalize(place);},
    async nearby(point,project,kind){
      if(!compatible(point,'google'))throw new Error('Google needs WGS84 coordinates. Select this location again on Google Maps.');
      const types=kind==='competitors'?BUSINESSES[project.type].google:kind==='transit'?['transit_station','bus_station','subway_station','train_station']:kind==='parking'?['parking']:['supermarket','shopping_mall','pharmacy','bank'];
      if(!types.length)throw new Error('For custom businesses, use address / keyword search and independently verify competitors. No automatic category match is available.');
      const r=await timeout(Place.searchNearby({fields,locationRestriction:{center:{lat:point.lat,lng:point.lng},radius:project.radius},includedTypes:types,maxResultCount:20,rankPreference:SearchNearbyRankPreference.DISTANCE}),'Google nearby search');
      return {items:r.places.map(normalize),limit:20,limited:r.places.length>=20,query:types.join(', '),provider:'google',at:new Date().toISOString()};
    },
    center(point){if(compatible(point,'google')){map.panTo({lat:point.lat,lng:point.lng});map.setZoom(15);}},
    draw(sites,selected,radius,pois=[]){
      overlays.forEach(o=>{if(o.setMap)o.setMap(null);else o.map=null;});overlays=[];
      for(const [i,s] of sites.entries())if(compatible(s.point,'google')){const el=document.createElement('div');el.className='site-pin';el.textContent=String(i+1);const m=new AdvancedMarkerElement({map,position:{lat:s.point.lat,lng:s.point.lng},content:el,title:s.name});overlays.push(m);}
      for(const p of pois)if(p.point){const el=document.createElement('div');el.className='poi-pin';const m=new AdvancedMarkerElement({map,position:{lat:p.point.lat,lng:p.point.lng},content:el,title:p.name});overlays.push(m);}
      if(compatible(selected,'google'))overlays.push(new Circle({map,center:{lat:selected.lat,lng:selected.lng},radius,strokeColor:'#127e78',strokeOpacity:.8,strokeWeight:2,fillColor:'#127e78',fillOpacity:.08,clickable:false}));
    },
    destroy(){listener.remove();overlays.forEach(o=>{if(o.setMap)o.setMap(null);else o.map=null;});google.maps.event.clearInstanceListeners(map);element.replaceChildren();},
  };
}
