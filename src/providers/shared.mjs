export const providerLabel = p => p === 'google' ? 'Google Maps' : p === 'amap' ? 'Amap' : 'OpenStreetMap';
export const providerCRS = p => p === 'amap' ? 'GCJ02' : 'WGS84';
export function compatible(point, provider) { return point && point.crs === providerCRS(provider) && (!['google','amap'].includes(point.origin) || point.origin === provider); }
export function timeout(p, label='Request', ms=20000) { let timer; return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out. Check your connection, API permissions and quota, then retry.`)),ms);})]).finally(()=>clearTimeout(timer)); }
export function loadScript(src,id){return timeout(new Promise((resolve,reject)=>{document.getElementById(id)?.remove();const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('Map SDK could not load. Check your internet connection, firewall and key restrictions.'));};document.head.append(s);}), 'Map SDK');}
export function safeLink(uri){try {const u=new URL(uri);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
