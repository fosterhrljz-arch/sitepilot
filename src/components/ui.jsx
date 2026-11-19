import React,{useEffect,useRef,useId} from 'react';
import {MapPin,ArrowRight,AlertTriangle,Info,X,Plus,Save,Upload,ChevronRight} from 'lucide-react';
export {MapPin,ArrowRight,AlertTriangle,Info,X,Plus,Save,Upload,ChevronRight};
export function Button({children,variant='primary',className='',...props}){return <button className={`button ${variant} ${className}`} {...props}>{children}</button>}
export function PageHeader({title,description,action}){return <div className="page-heading"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>}
export function Notice({children,tone='info'}){return <div className={`notice ${tone}`} role={tone==='error'?'alert':'note'}>{tone==='warning'||tone==='error'?<AlertTriangle size={18}/>:<Info size={18}/>}<div>{children}</div></div>}
export function Field({label,hint,children}){const id=useId();return <div className="field"><label htmlFor={id}>{label}</label>{React.isValidElement(children)?React.cloneElement(children,{id,'aria-describedby':hint?`${id}-hint`:undefined}):children}{hint&&<small id={`${id}-hint`}>{hint}</small>}</div>}
export function NumberField({label,value,onChange,min=0,max=1e12,step='any',hint,...props}){return <Field label={label} hint={hint}><input type="number" value={value??''} min={min} max={max} step={step} onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))} {...props}/></Field>}
export const money=(n,currency='USD')=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(n):'Not entered';
export const number=(n,d=0)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'Unavailable';
export function EmptyState({icon:Icon=MapPin,title,children,action}){return <div className="empty-state"><div className="empty-icon"><Icon size={30}/></div><h2>{title}</h2><p>{children}</p>{action}</div>}
export function Tag({children,tone=''}){return <span className={`tag ${tone}`}>{children}</span>}
export function Modal({title,onClose,children,wide=false}){
  const ref=useRef(null);
  useEffect(()=>{const before=document.activeElement;const old=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=ref.current?.querySelectorAll('button:not([disabled]),input,select,textarea,a[href],[tabindex="0"]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);before?.focus();};},[]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} tabIndex={-1} className={`modal ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></header>{children}</section></div>
}
