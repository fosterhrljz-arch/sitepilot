// Synthetic SDK contracts for offline integration testing only. Never shipped in dist.
export const googleFixture=`
(() => {
  const location=(lat=39.7392,lng=-104.9903)=>({lat:()=>lat,lng:()=>lng});
  const place=i=>({id:'fixture-'+i,displayName:'Synthetic place '+i,formattedAddress:'Fixture address',location:location(39.7392+i*.0001,-104.9903),attributions:[]});
  class Map { constructor(el){this.el=el;el.innerHTML='<button data-testid="fixture-map-point" style="position:absolute;top:200px;left:100px">Select SDK fixture point</button>';this.el.querySelector('button').onclick=()=>this.handler?.({latLng:location()});}addListener(t,fn){this.handler=fn;return {remove(){}};}panTo(){}setZoom(){} }
  class Place {constructor({id}){Object.assign(this,place(1),{id});}async fetchFields(){return this;}static async searchByText(){return {places:[place(1),place(2)]};}static async searchNearby(request){if(!request.fields.includes('location'))throw Error('Missing location fields');const count=request.includedTypes.includes('parking')?3:request.includedTypes.includes('transit_station')?4:request.includedTypes.includes('supermarket')?8:6;return {places:Array.from({length:count},(_,i)=>place(i))};} }
  class Overlay {constructor(o){this.map=o.map;}setMap(m){this.map=m;}}
  window.google={maps:{importLibrary:async()=>({Map,Circle:Overlay,AdvancedMarkerElement:Overlay,Place,SearchNearbyRankPreference:{DISTANCE:'DISTANCE'}}),event:{clearInstanceListeners(){}}}};
  window.__sitepilotGoogleReady();
})();`;
export const amapFixture=`
(() => {
  const location=(lat=39.9093,lng=116.3974)=>({getLat:()=>lat,getLng:()=>lng});
  const place=i=>({id:'fixture-'+i,name:'Synthetic place '+i,address:'Fixture address',location:location(39.9093+i*.0001,116.3974)});
  class Map {constructor(el){this.el=el;el.innerHTML='<button data-testid="fixture-map-point" style="position:absolute;top:200px;left:100px">Select SDK fixture point</button>';el.querySelector('button').onclick=()=>this.handler?.({lnglat:location()});}on(t,fn){this.handler=fn;}off(){}addControl(){}setZoomAndCenter(){}remove(){}add(){}destroy(){this.el.replaceChildren();}}
  class PlaceSearch {constructor(o){this.options=o;}search(text,cb){cb('complete',{poiList:{pois:[place(1),place(2)],count:2}});}searchNearBy(keyword,center,radius,cb){const type=this.options.type,count=type==='150900'?3:type==='150500|150700'?4:type.includes('060100')?8:6;cb('complete',{poiList:{pois:Array.from({length:count},(_,i)=>place(i)),count}});}}
  class Overlay {constructor(o){}}
  window.AMap={Map,PlaceSearch,Marker:Overlay,Circle:Overlay,Pixel:Overlay,Scale:Overlay,ToolBar:Overlay};
})();`;
