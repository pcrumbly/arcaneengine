import { useEffect, useState } from 'react';

const blank = { label:'', from_location_id:'', to_location_id:'', travel_time:0, resource_cost:0, one_way:false, enabled:true };
export default function WorldRouteForm({ route, locations, busy, onSave, onDelete, onCancel }) {
  const [values,setValues]=useState(blank);
  useEffect(()=>setValues({...blank,...route}),[route]);
  const set=(key,value)=>setValues(current=>({...current,[key]:value}));
  const submit=e=>{e.preventDefault();onSave(values)};
  return <form onSubmit={submit} className="space-y-4 rounded-lg border border-white/10 bg-runtime-surface p-4">
    <div><h3 className="font-semibold">{route?.id?'Edit route':'Create route'}</h3><p className="text-xs text-slate-500">Two-way routes work in both directions; one-way routes only follow the arrow.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Route label"><input required value={values.label} onChange={e=>set('label',e.target.value)} className="mt-1.5 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm"/></Field><Field label="From"><select required value={values.from_location_id} onChange={e=>set('from_location_id',e.target.value)} className="mt-1.5 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm"><option value="">Select location</option>{locations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="To"><select required value={values.to_location_id} onChange={e=>set('to_location_id',e.target.value)} className="mt-1.5 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm"><option value="">Select location</option>{locations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Travel time"><input type="number" min="0" value={values.travel_time} onChange={e=>set('travel_time',Number(e.target.value))} className="mt-1.5 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm"/></Field></div>
    <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={values.one_way} onChange={e=>set('one_way',e.target.checked)}/>One way</label><label className="flex items-center gap-2"><input type="checkbox" checked={values.enabled} onChange={e=>set('enabled',e.target.checked)}/>Enabled</label></div>
    <div className="flex justify-end gap-2">{route?.id&&<button type="button" onClick={onDelete} className="mr-auto rounded border border-red-400/20 px-3 py-2 text-sm text-red-300">Delete</button>}<button type="button" onClick={onCancel} className="rounded border border-white/10 px-3 py-2 text-sm">Cancel</button><button disabled={busy||values.from_location_id===values.to_location_id} className="rounded bg-runtime-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Save route</button></div>
  </form>;
}
function Field({label,children}){return <label className="text-sm text-slate-300">{label}{children}</label>}