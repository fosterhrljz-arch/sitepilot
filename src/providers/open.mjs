import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {compatible} from './shared.mjs';
export async function apiJson(path){const r=await fetch(path,{signal:AbortSignal.timeout(26000)});let data;try{data=await r.json();}catch{throw new Error('The local data service could not respond. Launch SitePilot.exe and try again.');}if(!r.ok)throw new Error(data.error||'Data request failed. Try again later.');return data;}
export async function connectOpen(config,element,onPick,onFailure,onMove,onSelect){
  const map=L.map(element,{center:[39.7505,-104.995],zoom:14,zoomControl:false,attributionControl:true,zoomAnimation:false});
  L.control.zoom({position:'bottomleft'}).addTo(map);L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',crossOrigin:true}).addTo(map);
  let failures=0;tiles.on('tileerror',()=>{if(++failures===3)onFailure?.('Map tiles are unavailable. Check your connection. Saved pins and manual coordinate entry still work.');});
  const layers=L.layerGroup().addTo(map),toPoint=e=>({lat:e.latlng.lat,lng:e.latlng.lng,crs:'WGS84',origin:'osm'});
  map.on('click',e=>onPick(toPoint(e)));
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(element);
  return{provider:'open',
    async search(text){const match=text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);if(match){const lat=Number(match[1]),lng=Number(match[2]);if(Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('Coordinates must be latitude −90 to 90, longitude −180 to 180.');return[{id:'coordinates',name:'Entered coordinates',address:`${lat}, ${lng}`,point:{lat,lng,crs:'WGS84',origin:'user'},provider:'open'}];}return(await apiJson(`/api/open/search?q=${encodeURIComponent(text)}`)).items;},
    center(point){if(compatible(point,'open'))map.setView([point.lat,point.lng],16,{animate:false});},
    fit(points){const valid=points.filter(p=>compatible(p,'open'));if(valid.length)map.fitBounds(valid.map(p=>[p.lat,p.lng]),{padding:[55,55],maxZoom:16,animate:false});},
    draw(sites,selected,radius,pois=[]){layers.clearLayers();sites.forEach((s,i)=>{if(!compatible(s.point,'open'))return;const marker=L.marker([s.point.lat,s.point.lng],{icon:L.divIcon({className:'leaflet-site-marker',html:`<span>${i+1}</span>`,iconSize:[32,40],iconAnchor:[16,36]}),title:s.name,draggable:!!onMove}).addTo(layers);marker.on('click',e=>{L.DomEvent.stopPropagation(e);onSelect?.(s.id);});marker.on('dragend',()=>{const pos=marker.getLatLng();onMove?.(s.id,{lat:pos.lat,lng:pos.lng,crs:'WGS84',origin:'osm'});});});
      if(compatible(selected,'open')){L.circle([selected.lat,selected.lng],{radius,color:'#087f78',weight:1.5,fillOpacity:.07,interactive:false}).addTo(layers);L.circleMarker([selected.lat,selected.lng],{radius:7,color:'#fff',weight:3,fillColor:'#087f78',fillOpacity:1,interactive:false}).addTo(layers);}
      pois.filter(p=>compatible(p.point,'open')).forEach(p=>L.circleMarker([p.point.lat,p.point.lng],{radius:4,color:p.groups?.includes('competitors')?'#d78345':'#73869b',weight:1,fillOpacity:.9}).bindTooltip(Object.assign(document.createElement('span'),{textContent:p.name})).addTo(layers));
    },destroy(){observer.disconnect();map.remove();},
  };
}
