import {searchOpen,nearbyOpen,testOpen} from './open-services.mjs';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.SITEPILOT_PORT||47831),host='127.0.0.1',origin=`http://${host}:${port}`;
const token=randomBytes(32).toString('hex');let securityCode='';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
function open(){if(!process.argv.includes('--open'))return;if(process.platform==='win32')spawn('rundll32.exe',['url.dll,FileProtocolHandler',origin],{detached:true,stdio:'ignore',windowsHide:true}).unref();}
const server=http.createServer(async(req,res)=>{
  const reply=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));};
  try{
    if(req.headers.host!==`${host}:${port}`&&req.headers.host!==`localhost:${port}`)return reply(403,{error:'Host rejected'});
    if(req.headers.origin&&![origin,`http://localhost:${port}`].includes(req.headers.origin))return reply(403,{error:'Origin rejected'});
    if(req.headers['sec-fetch-site']==='cross-site')return reply(403,{error:'Cross-site request rejected'});
    const url=new URL(req.url,origin);
    if(url.pathname==='/api/health')return reply(200,{app:'SitePilot',version:'1.1.0'});
    if(url.pathname.startsWith('/api/open/')&&req.method==='GET'){
      try{if(url.pathname==='/api/open/search')return reply(200,await searchOpen(url.searchParams.get('q')||''));
      if(url.pathname==='/api/open/test')return reply(200,await testOpen(url.searchParams.get('service')||'main'));
      if(url.pathname==='/api/open/nearby')return reply(200,await nearbyOpen({lat:Number(url.searchParams.get('lat')),lng:Number(url.searchParams.get('lng')),radius:Number(url.searchParams.get('radius')),business:url.searchParams.get('business'),service:url.searchParams.get('service')||'main'}));
      return reply(404,{error:'Unknown open-data operation'});}catch(e){return reply(503,{error:e.message});}
    }
    if(url.pathname==='/api/session'&&req.method==='GET')return reply(200,{token});
    if(url.pathname==='/api/amap-config'&&req.method==='POST'){
      if(req.headers['x-sitepilot-token']!==token)return reply(403,{error:'Token rejected'});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)return reply(413,{error:'Too large'});}
      const data=JSON.parse(body);if(data.securityCode===''){securityCode='';return reply(200,{ok:true});}if(typeof data.securityCode!=='string'||!/^[a-zA-Z0-9_-]{8,256}$/.test(data.securityCode))return reply(400,{error:'Invalid code'});
      securityCode=data.securityCode;return reply(200,{ok:true});
    }
    if(url.pathname.startsWith('/_AMapService/')){
      if(req.method!=='GET'||!securityCode)return reply(400,{error:'Configure Amap first'});
      const suffix=url.pathname.slice('/_AMapService'.length);
      if(!/^\/v[345]\/[a-zA-Z0-9/_-]+$/.test(suffix)||url.search.length>12000)return reply(400,{error:'Unsupported proxy path'});
      const upstream=new URL(suffix,suffix.startsWith('/v4/map/styles')?'https://webapi.amap.com':'https://restapi.amap.com');upstream.search=url.search;upstream.searchParams.set('jscode',securityCode);
      const response=await fetch(upstream,{signal:AbortSignal.timeout(20000),redirect:'error'});
      return reply(response.status,Buffer.from(await response.arrayBuffer()),response.headers.get('content-type')||'application/json');
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return reply(405,{error:'Method not allowed'});
    const relative=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
    if(!file.startsWith(root+path.sep))return reply(403,{error:'Path rejected'});
    const info=await stat(file);if(!info.isFile())return reply(404,{error:'Not found'});
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(e){reply(e.code==='ENOENT'?404:502,{error:e.code==='ENOENT'?'Not found':'Request failed. Check connection and configuration.'});}
});
server.on('error',async e=>{if(e.code==='EADDRINUSE'){try{const r=await fetch(origin+'/api/health');const current=await r.json();if(current.app==='SitePilot'&&current.version==='1.1.0'){open();process.exit(0);}}catch{}console.error(`Port ${port} is occupied. Close the other application or set SITEPILOT_PORT.`);}else console.error('Could not start SitePilot:',e.code);process.exit(1);});
server.listen(port,host,()=>{console.log(`SitePilot: ${origin}`);open();});
