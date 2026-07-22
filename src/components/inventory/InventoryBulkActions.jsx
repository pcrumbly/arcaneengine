import { useState } from 'react';
import { FolderInput } from 'lucide-react';

export default function InventoryBulkActions({count,containers,busy,onMove,onClear}){
  const [containerId,setContainerId]=useState('');
  if(!count)return null;
  return <div className="mb-3 flex flex-col gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/5 p-3 sm:flex-row sm:items-center"><p className="text-sm text-cyan-100">{count} item{count===1?'':'s'} selected</p><div className="flex flex-1 gap-2 sm:justify-end"><select aria-label="Bulk destination" value={containerId} onChange={event=>setContainerId(event.target.value)} className="min-w-0 rounded border border-white/10 bg-runtime px-3 py-2 text-sm"><option value="">Move to…</option>{containers.map(container=><option key={container.id} value={container.id}>{container.name}</option>)}</select><button disabled={busy||!containerId} onClick={()=>onMove(containerId)} className="inline-flex items-center gap-2 rounded bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-40"><FolderInput size={15}/>Move</button><button disabled={busy} onClick={onClear} className="rounded border border-white/10 px-3 py-2 text-sm">Clear</button></div></div>;
}