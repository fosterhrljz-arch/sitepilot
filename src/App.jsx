import React,{useState,useEffect,useRef,lazy,Suspense} from 'react';
import {Home as HomeIcon,Map,ChartNoAxesColumnIncreasing,Copy,FileText,Settings as SettingsIcon,Layers,Menu,CheckCircle2} from 'lucide-react';
import {AppContext} from './context';
import Home from './pages/Home';
import {loadProjects,saveProjects,portableProject,validateProject,download,googleCache} from './core/storage.mjs';
import {BUSINESSES} from './core/model.mjs';
import {Button,MapPin,Save,Notice,EmptyState} from './components/ui';
const Explorer=lazy(()=>import('./pages/Explorer'));
const Analysis=lazy(()=>import('./pages/Analysis'));
const Compare=lazy(()=>import('./pages/Compare'));
const Report=lazy(()=>import('./pages/Report'));
const Settings=lazy(()=>import('./components/Settings'));
const nav=[['home','Home',HomeIcon],['map','Map Explorer',Map],['analysis','Location Analysis',ChartNoAxesColumnIncreasing],['compare','Compare Locations',Copy],['report','Decision Report',FileText]];
export default function App(){
  const [initial]=useState(loadProjects),[projects,setProjects]=useState(initial.projects),[current,setCurrent]=useState(initial.projects[0]?.id||null),[page,setPage]=useState('home');
  const [selectedSiteId,setSelectedSiteId]=useState('');
  const [error,setError]=useState(initial.error),[settings,setSettings]=useState(false),[mobileNav,setMobileNav]=useState(false),[toast,setToast]=useState(''),[canSave,setCanSave]=useState(!initial.error);
  const [config,setConfig]=useState({provider:'open',openServer:'main',openData:false,googleKey:'',googleMapId:'',amapKey:'',amapSecurity:''});
  const fileRef=useRef(null),toastTimer=useRef(null);const project=projects.find(p=>p.id===current)||null;
  const notify=text=>{setToast(text);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),5000);};
  useEffect(()=>{if(!canSave)return;try{saveProjects(projects);setError(null);}catch{setError('Local saving failed (storage full or unavailable). Use Save project to download a JSON backup.');}},[projects,canSave]);
  useEffect(()=>{const timer=setInterval(()=>setProjects(prev=>prev.some(p=>p.sites.some(s=>s.googleLocation&&!googleCache(s.googleLocation,s.placeRef)))?prev.map(p=>({...p,sites:p.sites.map(s=>s.googleLocation&&!googleCache(s.googleLocation,s.placeRef)?{...s,googleLocation:null}:s)})):prev),30000);return()=>clearInterval(timer);},[]);
  const navigate=id=>{setPage(id);setMobileNav(false);window.scrollTo(0,0);};
  const updateProject=update=>setProjects(prev=>prev.map(p=>p.id===current?{...(typeof update==='function'?update(p):{...p,...update}),updatedAt:new Date().toISOString()}:p));
  const updateSite=(id,update)=>updateProject(p=>({...p,sites:p.sites.map(s=>s.id===id?(typeof update==='function'?update(s):{...s,...update}):s)}));
  const createProject=(p,demo=false)=>{setProjects(prev=>[p,...prev]);setCurrent(p.id);setCanSave(true);navigate(demo?'compare':'map');notify(demo?'Illustrative example opened. All figures are synthetic.':'Project created and saved on this device.');};
  const deleteProject=id=>{if(!confirm('Delete this local project? Export a backup first if you need it.'))return;setProjects(prev=>prev.filter(p=>p.id!==id));if(current===id)setCurrent(projects.find(p=>p.id!==id)?.id||null);};
  const save=()=>{if(project){download(`${project.name.replace(/[^a-zA-Z0-9_-]/g,'-')}.sitepilot.json`,JSON.stringify(portableProject(project),null,2));notify('Project backup downloaded with independent pins, open-data observations and inputs. Restricted provider caches and credentials are excluded.');}};
  const importFile=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2*1024*1024)throw new Error('Project file is too large (2 MB maximum).');const p=validateProject(JSON.parse(await file.text()));if(projects.some(x=>x.id===p.id))p.id=crypto.randomUUID();createProject(p);}catch(e){notify(`Import failed: ${e.message}`);}};
  const ctx={project,projects,selectedSiteId,setSelectedSiteId,updateProject,updateSite,createProject,selectProject:setCurrent,deleteProject,navigate,notify,config,setConfig,openSettings:()=>setSettings(true),importProject:()=>fileRef.current.click()};
  return <AppContext.Provider value={ctx}><div className="app-shell"><aside className={`sidebar ${mobileNav?'expanded':''}`}><a href="#home" className="brand" onClick={e=>{e.preventDefault();navigate('home');}}><span className="brand-mark"><MapPin size={26} strokeWidth={2.5}/></span><span><strong>SitePilot</strong><small>Location intelligence<br/>V1.1 · Local workspace</small></span></a><nav aria-label="Main navigation">{nav.map(([id,label,Icon])=><button key={id} aria-current={page===id?'page':undefined} className={`nav-item ${page===id?'active':''}`} onClick={()=>navigate(id)}><Icon size={19}/>{label}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item" onClick={()=>setSettings(true)}><SettingsIcon size={19}/>Settings</button><div className="local-status"><Layers size={18}/><span><i/>Local workspace</span></div><small>Private by default. Yours to export.</small></div></aside>
    <div className="workspace"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={()=>setMobileNav(!mobileNav)}><Menu size={22}/></button><div className="project-selector">{projects.length?<select aria-label="Active project" value={current||''} onChange={e=>setCurrent(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>:<span>Your location workspace</span>}{project&&<span className="topbar-type">{BUSINESSES[project.type].label}</span>}</div><div className="topbar-actions"><span className="autosave-status"><i/>{error?'Save needs attention':'Saved locally'}</span><Button variant="secondary" onClick={save} disabled={!project}><Save size={16}/>Save project</Button></div></header>
    <main id="main-content" className={`page page-${page}`}>{error&&<Notice tone="error">{error}</Notice>}{project?.demo&&page!=='home'&&<Notice tone="warning">Illustrative example — synthetic inputs, not live market data. Do not use these figures for a real decision.</Notice>}
    <Suspense fallback={<div className="loading">Opening workspace…</div>}>{page==='home'?<Home/>:!project?<EmptyState title="Start with a project" action={<Button onClick={()=>navigate('home')}>Create a project</Button>}>Choose your business type and create a project to begin.</EmptyState>:page==='map'?<Explorer key={`${project.id}-${config.provider}`}/>:page==='analysis'?<Analysis key={project.id}/>:page==='compare'?<Compare/>:<Report/>}</Suspense></main><footer className="app-footer"><span>SitePilot 1.1</span><span>Evidence before instinct.</span></footer></div></div>
    {settings&&<Suspense fallback={null}><Settings onClose={()=>setSettings(false)}/></Suspense>}{toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}<input ref={fileRef} hidden type="file" accept=".json,.sitepilot.json" onChange={importFile}/></AppContext.Provider>
}
