import {PROFILES,criteriaFor} from './profiles.mjs';
export {PROFILES,criteriaFor};
export const CRITERIA=criteriaFor('coffee');
export const BUSINESSES = {
  coffee: { label: 'Coffee shop', icon: 'Coffee', weights: [20, 10, 20, 15, 15, 20], google: ['cafe','coffee_shop'], amap: '050500', keyword: '咖啡', description:'Prioritizes transit and complementary amenities for convenient daily visits.' },
  restaurant: { label: 'Restaurant', icon: 'Utensils', weights: [10, 15, 15, 20, 15, 25], google: ['restaurant'], amap: '050000', keyword: '餐厅', description:'Balances competition, convenient access and financial headroom.' },
  convenience: { label: 'Convenience store', icon: 'Store', weights: [20, 20, 10, 20, 15, 15], google: ['convenience_store'], amap: '060200', keyword: '便利店', description:'Emphasizes easy access and public transport for frequent short visits.' },
  fruit: { label: 'Fruit shop', icon: 'Apple', weights: [10, 15, 15, 25, 20, 15], google: ['grocery_store'], amap: '060400', keyword: '水果', description:'Emphasizes competition and rent resilience. Grocery matches need verification.' },
  beauty: { label: 'Beauty salon', icon: 'Scissors', weights: [10, 20, 15, 15, 15, 25], google: ['beauty_salon'], amap: '071100', keyword: '美容', description:'Emphasizes convenient appointment access and financial headroom.' },
  custom: { label: 'Custom business', icon: 'BriefcaseBusiness', weights: [15, 15, 15, 20, 15, 20], google: [], amap: '', keyword: '', description:'Set a competitor keyword and adjust the weights to your business.' },
};

for(const [type,b] of Object.entries(BUSINESSES)){b.description=PROFILES[type].description;b.weights=[25,15,15,10,15,20];}
export const weightsFor=type=>Object.fromEntries(criteriaFor(type).map((c,i)=>[c.id,BUSINESSES[type].weights[i]]));
export const present=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
export function finance(f, scenario = {}) {
  const errors = [];
  for (const k of ['rent','otherCosts','margin','ticket','days']) if (!present(f[k])) errors.push(`${({rent:'Monthly rent',otherCosts:'Other fixed costs',margin:'Contribution margin',ticket:'Average transaction value',days:'Trading days'})[k]} is required.`);
  if (present(f.rent) && f.rent < 0) errors.push('Rent cannot be negative.');
  if (present(f.otherCosts) && f.otherCosts < 0) errors.push('Other fixed costs cannot be negative.');
  if (present(f.margin) && (f.margin <= 0 || f.margin > 100)) errors.push('Contribution margin must be greater than 0 and at most 100%.');
  if (present(f.ticket) && f.ticket <= 0) errors.push('Average transaction must be greater than zero.');
  if (present(f.days) && (f.days < 1 || f.days > 31 || !Number.isInteger(f.days))) errors.push('Trading days must be an integer from 1 to 31.');
  if (f.dailyOrders != null && (!present(f.dailyOrders) || f.dailyOrders < 0)) errors.push('Assumed daily transactions cannot be negative.');
  for (const key of ['setupCost','cashReserve']) if (f[key] != null && (!present(f[key]) || f[key] < 0)) errors.push(`${key} must be a nonnegative number.`);
  if (errors.length) return { valid: false, errors };
  const rentFactor = 1 + (scenario.rentPct ?? 0)/100;
  const salesFactor = 1 + (scenario.salesPct ?? 0)/100;
  if (!Number.isFinite(rentFactor) || rentFactor < 0 || !Number.isFinite(salesFactor) || salesFactor < 0) return {valid:false,errors:['Scenario changes must be finite and at least −100%.']};
  const fixed = f.rent*rentFactor + f.otherCosts;
  const ratio = f.margin/100;
  const breakEvenSales = fixed/ratio;
  const breakEvenOrders = breakEvenSales/f.ticket;
  const revenue = present(f.dailyOrders) ? f.dailyOrders*f.ticket*f.days*salesFactor : null;
  const profit=revenue === null ? null : revenue*ratio-fixed;
  if([fixed,breakEvenSales,breakEvenOrders,revenue,profit].some(v=>v!==null&&!Number.isFinite(v)))return{valid:false,errors:['These values are too large to calculate safely. Reduce the inputs.']};
  return { valid:true, errors:[], fixed, breakEvenSales, breakEvenOrders, dailyBreakEven:breakEvenOrders/f.days,
    revenue, profit, payback:present(f.setupCost)&&profit>0?f.setupCost/profit:null, runway:present(f.cashReserve)&&profit<0?f.cashReserve/-profit:null,
    safety: revenue === null ? null : revenue > 0 ? (revenue-breakEvenSales)/revenue : fixed === 0 ? 0 : -1 };
}

export function validEvidence(e,radius){return e && e.radius===radius && /^\d{4}-\d{2}-\d{2}$/.test(e.date||'') && Number.isFinite(Date.parse(e.date)) && new Date(e.date).toISOString().slice(0,10)===e.date && e.date<=new Date().toISOString().slice(0,10) && Boolean(e.method?.trim());}
export function validOpenAnalysis(site,project){const a=site.openAnalysis;return Boolean(a && a.provider==='osm' && site.point?.crs==='WGS84' && ['osm','user'].includes(site.point.origin) && a.point?.lat===site.point.lat && a.point?.lng===site.point.lng && a.business===project.type && a.radius===project.radius && Date.now()-Date.parse(a.at)>=0 && Date.now()-Date.parse(a.at)<86400000 && !a.limited);}
export function metrics(site,project,scenario={}){
  const e=site.survey||{},p=PROFILES[project.type],f=finance(site.financial,scenario),valid=validEvidence(e,project.radius),openValid=validOpenAnalysis(site,project),open=site.evidenceMode==='open';
  const area=Math.PI*(project.radius/1000)**2,count=n=>present(n)&&n>=0&&Number.isInteger(n),positive=n=>present(n)&&n>0;
  const known=k=>valid&&present(e[k])&&e[k]>=0;
  const demandMeasure=known(p.demandKey)&&count(e[p.demandKey])?(p.duration?(positive(e.minutes)?e[p.demandKey]*60/e.minutes:null):p.period?(positive(e.researchDays)?e[p.demandKey]*30/e.researchDays:null):e[p.demandKey]):null;
  const demand=present(demandMeasure)?clamp(demandMeasure/project.targets.demand*100):null;
  // An empty or capped POI response cannot establish absence; independent zero counts can.
  const anchorCount=open?(openValid&&count(site.openAnalysis.counts.anchors)&&site.openAnalysis.counts.anchors>0?site.openAnalysis.counts.anchors:null):(valid&&count(e.anchors)?e.anchors:null);
  const competitorCount=open?(openValid&&count(site.openAnalysis.counts.competitors)&&site.openAnalysis.counts.competitors>0?site.openAnalysis.counts.competitors:null):(valid&&count(e.competitors)?e.competitors:null);
  const anchors=present(anchorCount)?clamp(anchorCount/project.targets.anchors*100):null;
  let operations=null;
  if(valid){if(project.type==='coffee'){if(known('nearestTransit')&&typeof e.stepFree==='boolean')operations=.7*clamp(100-e.nearestTransit/10)+(e.stepFree?30:0);}else if(p.fields.every(([k])=>typeof e[k]==='boolean'))operations=p.fields.reduce((sum,[k])=>sum+(e[k]?50:0),0);}
  const density=present(competitorCount)?competitorCount/area:null;
  const competition=present(demand)&&present(anchors)&&present(density)?demand*(.4+.6*anchors/100)/(1+Math.max(0,density-project.targets.competitionScale)/project.targets.competitionScale):null;
  const adjustedRent=site.financial.rent*(1+(scenario.rentPct??0)/100);
  const affordability=present(site.financial.rent)&&site.financial.rent>=0&&present(project.rentBudget)&&project.rentBudget>0&&present(adjustedRent)&&adjustedRent>=0?(adjustedRent===0?100:clamp(project.rentBudget/adjustedRent*100)):null;
  const values={demand,anchors,operations,competition,affordability,viability:f.valid&&f.safety!==null?clamp(50+100*f.safety):null};
  const provenance=project.demo?'Synthetic example':e.kind==='estimate'?'User estimate':'User-reported observation';
  const details={
    demand:{source:provenance,input:present(demandMeasure)?`${demandMeasure.toFixed(1)} ${p.unit}; target ${project.targets.demand}`:'Needs a dated, documented demand observation and its duration where applicable.'},
    anchors:{source:open?'OpenStreetMap mapped observations':provenance,input:present(anchorCount)?`${anchorCount} relevant destinations; target ${project.targets.anchors}`:'No usable destination count. Blank, stale, empty or capped API results remain unknown.'},
    operations:{source:provenance,input:p.fields.map(([k,label])=>`${label}: ${e[k]===true?'Yes':e[k]===false?'No':e[k]??'Unknown'}`).join('; ')},
    competition:{source:open?`OSM + ${provenance.toLowerCase()}`:provenance,input:present(competition)?`${competitorCount} competitors / ${area.toFixed(2)} km²; demand ${demand.toFixed(1)}, destinations ${anchors.toFixed(1)}, density threshold ${project.targets.competitionScale}`:'Requires a usable competitor count, independent demand evidence and relevant destinations. Fewer competitors alone cannot produce a score.'},
    affordability:{source:'User financial assumptions',input:`Preferred rent budget ${project.rentBudget??'unknown'}; scenario rent ${present(site.financial.rent)?adjustedRent:'unknown'}`},
    viability:{source:'Calculated financial scenario',input:f.valid&&f.safety!==null?`Margin of safety ${(f.safety*100).toFixed(1)}%`:'Enter complete costs and an explicit daily sales assumption.'},
  };
  const blockers=valid?p.fields.filter(([k,,kind])=>kind==='boolean'&&e[k]===false).map(([,label])=>label):[];
  const risks=[...(present(demand)&&demand<50?['Entered demand evidence is below half of the planning target.']:[]),...(present(competition)&&competition<40?['Demand and commercial context produce weak market fit under the selected assumptions.']:[]),...(present(site.financial.rent)&&project.rentBudget>0&&adjustedRent>project.rentBudget?['Scenario rent exceeds your preferred monthly rent budget.']:[]),...blockers.map(label=>`Unmet requirement: ${label}.`),...(f.profit<0?['Assumed sales do not cover operating costs.']:[]),...(f.safety!==null&&f.safety<.2&&f.profit>=0?['Less than 20% sales headroom in this scenario.']:[]),...(open?['OSM business coverage may be incomplete; counts do not prove demand.']:[]),...(e.kind==='estimate'?['Location evidence includes estimates; validate in person.']:[]),...(!valid?['Field evidence lacks a valid date, method or matching catchment.']:[])];
  return {values,details,financial:f,area,surveyValid:valid,openValid,evidence:e,source:open?'open':'survey',blockers,risks,demandMeasure};
}
export function weightedScore(values,weights,mask=Object.keys(weights)){
  const total=Object.values(weights).reduce((s,w)=>s+Math.max(0,w||0),0);if(!total)return{score:null,coverage:0,lower:0,upper:100};
  let known=0,sum=0;for(const key of new Set(mask))if(present(values[key])){const w=Math.max(0,weights[key]||0);known+=w;sum+=w*clamp(values[key]);}
  return {score:known?sum/known:null,coverage:known/total,lower:sum/total,upper:(sum+100*(total-known))/total};
}
export function compare(project,scenario={}){
  const criteria=criteriaFor(project.type),base=project.sites.map(site=>({site,...metrics(site,project,scenario)}));
  const common=criteria.map(c=>c.id).filter(id=>base.length&&base.every(s=>present(s.values[id])));
  const rows=base.map(s=>({...s,...weightedScore(s.values,project.weights,common),individual:weightedScore(s.values,project.weights)}));
  const ranked=[...rows].sort((a,b)=>(b.score??-1)-(a.score??-1)),coverage=rows[0]?.coverage||0;
  const canRank=rows.length>=3&&coverage>=.7&&common.includes('demand')&&common.includes('viability');
  const tied=canRank&&Math.abs(ranked[0].score-ranked[1].score)<2;
  const leader=canRank&&!tied&&!ranked[0].blockers.length&&ranked[0].financial.profit>0?ranked[0]:null;
  return {rows,ranked,common,criteria,coverage,canRank,tied,leader,overlap:leader?ranked.slice(1).some(r=>r.upper>=leader.lower):false};
}
export function ahp(matrix) {
  const n=matrix.length;
  if(n<2 || n>10 || matrix.some((r,i)=>r.length!==n || r.some((x,j)=>!present(x)||x<=0||Math.abs(x*matrix[j]?.[i]-1)>1e-6) || Math.abs(r[i]-1)>1e-6)) throw new Error('AHP needs a positive reciprocal square matrix (2–10 criteria).');
  let w=Array(n).fill(1/n);
  for(let i=0;i<150;i++){const y=matrix.map(r=>r.reduce((s,x,j)=>s+x*w[j],0));const total=y.reduce((a,b)=>a+b,0);const next=y.map(x=>x/total);const d=Math.max(...next.map((x,j)=>Math.abs(x-w[j])));w=next;if(d<1e-12)break;}
  const lambda=matrix.map(r=>r.reduce((s,x,j)=>s+x*w[j],0)).reduce((s,x,i)=>s+x/w[i],0)/n;
  const ri=[0,0,0,.58,.90,1.12,1.24,1.32,1.41,1.45,1.49][n];
  return {weights:w,lambda,cr:ri?Math.max(0,(lambda-n)/(n-1)/ri):0};
}
export function distanceMeters(a,b) {
  if(a.crs!==b.crs) throw new Error('Coordinate systems must match.');
  if([a,b].some(p=>!present(p.lat)||!present(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180)) throw new Error('Invalid coordinates.');
  const rad=x=>x*Math.PI/180, dl=rad(b.lat-a.lat), dn=rad(b.lng-a.lng);
  const h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;
  return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}

export const newSite=(name='Candidate site')=>({id:crypto.randomUUID(),name,address:'',point:null,placeRef:null,evidenceMode:'survey',financial:{rent:null,otherCosts:null,margin:null,ticket:null,days:26,dailyOrders:null,setupCost:null,cashReserve:null},survey:{anchors:null,competitors:null,nearestTransit:null,passers:null,minutes:null,households:null,inquiries:null,researchDays:null,radius:800,date:'',method:'',kind:'observed'},notes:''});
export const newProject=(name,type='coffee',currency='USD')=>({version:2,id:crypto.randomUUID(),name,type,currency,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),demo:false,radius:800,rentBudget:null,targets:{demand:PROFILES[type].target,anchors:PROFILES[type].anchorTarget,competitionScale:8},weights:weightsFor(type),customKeyword:'',sites:[]});
