import { useEffect,useState } from 'react';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';
const ignored=new Set(['id','created_date','updated_date','created_by_id','game_id','content_version']);
const labels={create:'Created',update:'Updated',delete:'Deleted',rename:'Renamed',replace:'Replaced',move:'Moved'};
const changedFields=change=>[...new Set([...Object.keys(change.before||{}),...Object.keys(change.after||{})])].filter(key=>!ignored.has(key)&&JSON.stringify(change.before?.[key])!==JSON.stringify(change.after?.[key]));
export default function ContentChangeHistory({releaseId,contentType,itemId}){
  const [changes,setChanges]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let active=true;setLoading(true);setError('');invokeRuntimeCommand({command:'GET_CONTENT_CHANGE_HISTORY',releaseId,contentType,itemId}).then(({data})=>{if(active)setChanges(data.changeHistory||[])}).catch(error=>{if(active)setError(error.response?.data?.error||error.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[releaseId,contentType,itemId]);
  return <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1729]">
    <h3 className="border-b border-white/10 p-4 font-semibold text-slate-100">Change history</h3>
    <div className="max-h-96 space-y-3 overflow-y-auto p-4">
      {loading&&<p className="text-sm text-slate-500">Loading history…</p>}
      {error&&<p className="text-sm text-red-300">{error}</p>}
      {!loading&&!error&&!changes.length&&<p className="text-sm text-slate-500">No recorded changes.</p>}
      {changes.map(change=>{const fields=changedFields(change);return <details key={change.id} className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer list-none"><span className="font-medium text-slate-200">{labels[change.operation]||change.operation}</span><span className="ml-2 text-xs text-slate-500">r{change.workspace_revision}</span><p className="mt-1 text-xs text-slate-400">{new Date(change.occurred_at).toLocaleString()}</p>{fields.length>0&&<p className="mt-2 text-xs text-cyan-300">{fields.join(', ')}</p>}</summary>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap border-t border-white/10 pt-3 text-xs text-slate-400">{JSON.stringify({before:change.before,after:change.after},null,2)}</pre>
      </details>})}
    </div>
  </section>;
}