"use client";

import * as React from 'react';
import Link from 'next/link';
import { ArrowTopRightOnSquareIcon, BookOpenIcon, CalendarDaysIcon, ChartBarIcon, ClockIcon, WalletIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { HrisEmptyState, HrisStatusBadge } from '@/components/hris/HrisWorkspacePrimitives';

type DetailModule = 'Onboarding' | 'Leave' | 'Attendance' | 'Learning' | 'Performance' | 'Payroll';
type DetailItem = { id:string; module:string; title:string; status:string; occurredAt:string; details:Record<string,unknown> };

const moduleMeta: Record<DetailModule, { path:string; description:string; icon:typeof CalendarDaysIcon; columns:Array<[string,string]> }> = {
  Onboarding: { path:'/people/onboarding', description:'Journey progress, completed steps, and onboarding milestones for this employee.', icon:CalendarDaysIcon, columns:[['completedAt','Completed']] },
  Leave: { path:'/workforce/leave', description:'Leave requests, dates, duration, and approval status for this employee.', icon:CalendarDaysIcon, columns:[['startDate','Start date'],['endDate','End date'],['units','Days']] },
  Attendance: { path:'/workforce/attendance?view=attendance', description:'Daily attendance records, check-in, check-out, and exceptions for this employee.', icon:ClockIcon, columns:[['checkIn','Check in'],['checkOut','Check out']] },
  Learning: { path:'/learning', description:'Course enrollments, progress, completion, and learning status for this employee.', icon:BookOpenIcon, columns:[['progress','Progress'],['completedAt','Completed']] },
  Performance: { path:'/workforce/performance', description:'Performance cycles, review status, and released ratings for this employee.', icon:ChartBarIcon, columns:[['overallRating','Overall rating']] },
  Payroll: { path:'/payroll', description:'Payroll periods, gross pay, net pay, and processing status for this employee.', icon:WalletIcon, columns:[['grossPay','Gross pay'],['netPay','Net pay']] },
};

export function EmployeeModuleDetailEmbed({ employeeId, module }: { employeeId:string; module:DetailModule }) {
  const [items,setItems]=React.useState<DetailItem[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');
  const meta=moduleMeta[module];
  const Icon=meta.icon;
  const separator=meta.path.includes('?')?'&':'?';
  const sourceHref=`${meta.path}${separator}employeeId=${encodeURIComponent(employeeId)}`;

  React.useEffect(()=>{
    let active=true; setLoading(true); setError('');
    void fetch(`/api/hr/v1/employees/${employeeId}/timeline?module=${encodeURIComponent(module)}`,{cache:'no-store'})
      .then(async response=>{const body=await response.json(); if(!response.ok) throw new Error(body?.error?.message||`Unable to load ${module.toLowerCase()} details.`); if(active)setItems(body.data||[]);})
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Unable to load employee records.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[employeeId,module]);

  const completed=items.filter(item=>['completed','approved','paid','present'].includes(String(item.status).toLowerCase())).length;
  const attention=items.filter(item=>['rejected','overdue','failed','absent','at_risk'].includes(String(item.status).toLowerCase())).length;

  return <section className="min-h-[560px] bg-background">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 text-primary"/><div><h2 className="text-base font-semibold">{module} details</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div></div><Button asChild variant="outline" size="sm"><Link href={sourceHref}>Open {module.toLowerCase()} workspace <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4"/></Link></Button></header>
    <div className="grid grid-cols-3 divide-x divide-border border-b border-border"><Metric label="Employee records" value={items.length}/><Metric label="Completed" value={completed}/><Metric label="Needs attention" value={attention} warning={attention>0}/></div>
    {loading?<div className="m-5 h-64 animate-pulse bg-muted/35" aria-label={`Loading ${module} details`}/>:error?<div role="alert" className="m-5 border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>:items.length===0?<HrisEmptyState title={`No ${module.toLowerCase()} records`} description={`No ${module.toLowerCase()} activity is recorded for this employee yet.`}/>:<div className="overflow-x-auto"><div className="min-w-[720px]"><div className="grid border-b border-border bg-muted/25 px-5 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground" style={{gridTemplateColumns:`minmax(210px,1.4fr) 120px 120px repeat(${meta.columns.length}, minmax(130px,1fr))`}}><span>Record</span><span>Date</span><span>Status</span>{meta.columns.map(([,label])=><span key={label}>{label}</span>)}</div>{items.map(item=><div key={item.id} className="grid items-center border-b border-border px-5 py-4 text-sm" style={{gridTemplateColumns:`minmax(210px,1.4fr) 120px 120px repeat(${meta.columns.length}, minmax(130px,1fr))`}}><span className="min-w-0"><strong className="block truncate">{item.title}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">Employee-specific {module.toLowerCase()} record</span></span><span className="text-xs">{formatValue(item.occurredAt,'date')}</span><HrisStatusBadge value={item.status}/>{meta.columns.map(([key])=><span key={key} className="text-xs">{formatValue(item.details?.[key],key)}</span>)}</div>)}</div></div>}
  </section>;
}

function Metric({label,value,warning=false}:{label:string;value:number;warning?:boolean}){return <div className="px-5 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className={warning?'mt-1 text-xl font-semibold text-amber-600':'mt-1 text-xl font-semibold'}>{value}</p></div>;}
function formatValue(value:unknown,key:string){if(value===null||value===undefined||value==='')return '—'; if(key.toLowerCase().includes('pay'))return new Intl.NumberFormat('en-US',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(value)||0); if(key==='progress')return `${Number(value)||0}%`; if(key==='checkIn'||key==='checkOut'){const time=new Date(String(value));return Number.isNaN(time.getTime())?String(value):time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});} if(key.toLowerCase().includes('date')||key.toLowerCase().includes('at')||key==='date'){const date=new Date(String(value));return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString();} return String(value);}
