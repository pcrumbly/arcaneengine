import { useMemo,useState } from 'react';

export default function RuleInspector({rules}){
  const [kind,setKind]=useState('conditions'),[selected,setSelected]=useState('');
  const rows=useMemo(()=>[...(rules?.[kind]||[]),...(rules?.extensions||[]).filter(row=>row.kind===kind.slice(0,-1)).map(row=>({...row,custom:true}))],[rules,kind]);
  const rule=rows.find(row=>row.type===selected)||rows[0];
  const chooseKind=value=>{setKind(value);setSelected('')};
  return <section className="space-y-3 rounded border border-white/10 p-4 lg:col-span-2">
    <div><h4 className="text-sm font-medium">Rules Inspector</h4><p className="text-xs text-slate-500">Inspect the authoritative rule vocabulary available to this published content version.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-slate-500">Rule kind<select value={kind} onChange={event=>chooseKind(event.target.value)} className="mt-1 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm text-slate-100"><option value="conditions">Conditions</option><option value="effects">Effects</option></select></label>
      <label className="text-xs text-slate-500">Rule type<select value={rule?.type||''} onChange={event=>setSelected(event.target.value)} className="mt-1 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm text-slate-100">{rows.map(row=><option key={`${row.custom?'custom':'core'}:${row.type}`} value={row.type}>{row.type}{row.custom?' · extension':''}</option>)}</select></label>
    </div>
    {rule&&<div className="rounded bg-runtime p-3 text-xs"><div className="flex items-center justify-between gap-2"><code className="text-runtime-accent">{rule.type}</code><span className="text-slate-500">{rule.custom?'Content extension':'Core rule'}</span></div>{rule.description&&<p className="mt-2 text-slate-300">{rule.description}</p>}<dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(rule.fields||{}).map(([field,type])=><div key={field}><dt className="font-medium text-slate-200">{field}{rule.required?.includes(field)?' *':''}</dt><dd className="text-slate-500">{type}</dd></div>)}{(rule.parameters||[]).map(field=><div key={field}><dt className="font-medium text-slate-200">{field}</dt><dd className="text-slate-500">extension parameter</dd></div>)}</dl>{!Object.keys(rule.fields||{}).length&&!(rule.parameters||[]).length&&<p className="mt-3 text-slate-500">This rule has no configurable fields.</p>}</div>}
  </section>;
}