import React from 'react';
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid,Legend,LineChart,Line,ReferenceLine} from 'recharts';
import {criteriaFor,finance} from '../core/model.mjs';
import {money} from './ui';
export const COLORS=['#127e78','#59b4ae','#90cbc6','#6b879c','#b5a0ca'];
export function CriteriaChart({rows,common,type}){
  const data=criteriaFor(type).filter(c=>common.includes(c.id)).map(c=>({name:c.short,...Object.fromEntries(rows.map((r,i)=>[`site${i}`,Number(r.values[c.id].toFixed(1))]))}));
  if(!data.length)return <div className="chart-empty">Add shared survey or financial evidence to see a comparison.</div>;
  return <div className="chart" role="img" aria-label="Criterion scores by candidate"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{left:0,right:20,top:12,bottom:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7ecef"/><XAxis type="number" domain={[0,100]} tick={{fontSize:11}}/><YAxis dataKey="name" type="category" width={95} tick={{fontSize:12}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'#f0f6f5'}}/><Legend wrapperStyle={{fontSize:12}}/>{rows.map((r,i)=><Bar isAnimationActive={false} key={r.site.id} name={r.site.name} dataKey={`site${i}`} fill={COLORS[i]} radius={[0,3,3,0]} maxBarSize={12}/>)}</BarChart></ResponsiveContainer></div>
}
export function SensitivityChart({project,salesPct=0}){
  const valid=project.sites.filter(s=>{const f=finance(s.financial);return f.valid&&f.revenue!==null;});
  const data=[-30,-20,-10,0,10,20,30].map(rentPct=>({rentPct,...Object.fromEntries(valid.map((s,i)=>[`site${i}`,Math.round(finance(s.financial,{rentPct,salesPct}).profit)]))}));
  if(!valid.length)return <div className="chart-empty">Enter complete costs and assumed daily transactions to test rent sensitivity.</div>;
  return <div className="chart" role="img" aria-label="Monthly profit across rent changes"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{left:2,right:15,top:10,bottom:8}}><CartesianGrid stroke="#e7ecef"/><XAxis dataKey="rentPct" tickFormatter={v=>`${v>0?'+':''}${v}%`} tick={{fontSize:11}}/><YAxis tickFormatter={v=>Math.abs(v)>=1000?`${(v/1000).toFixed(0)}k`:v} width={55} tick={{fontSize:11}}/><Tooltip labelFormatter={v=>`Rent change: ${v}%`} formatter={(v,name)=>[money(v,project.currency),name]}/><ReferenceLine y={0} stroke="#8b969f" strokeDasharray="4 4"/><Legend wrapperStyle={{fontSize:12}}/>{valid.map((s,i)=><Line isAnimationActive={false} type="linear" key={s.id} name={s.name} dataKey={`site${i}`} stroke={COLORS[project.sites.findIndex(x=>x.id===s.id)]} strokeWidth={2.5} dot={{r:3}}/>)}</LineChart></ResponsiveContainer></div>
}
