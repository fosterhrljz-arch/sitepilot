import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const proxy=()=>({target:'http://127.0.0.1:47831',changeOrigin:true,configure(server){server.on('proxyReq',req=>{req.setHeader('origin','http://127.0.0.1:47831');});}});
export default defineConfig({plugins:[react()],base:'./',server:{host:'127.0.0.1',proxy:{'/api':proxy(),'/_AMapService':proxy()}},build:{chunkSizeWarningLimit:700}});
