import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Boxes, GitBranch, Map, PackageCheck } from 'lucide-react';

const cards = [{key:'games',label:'Games',icon:Boxes},{key:'releases',label:'Releases',icon:PackageCheck},{key:'locations',label:'Locations',icon:Map},{key:'connections',label:'Connections',icon:GitBranch}];
export default function Studio() {
  const [data, setData] = useState(null);
  useEffect(() => { base44.functions.invoke('runtimeCommand', { command: 'STUDIO_OVERVIEW' }).then((response) => setData(response.data)); }, []);
  if (!data) return <div className="p-6 text-sm text-slate-400">Loading studio…</div>;
  return <div className="p-4 sm:p-6"><p className="text-xs uppercase tracking-[.22em] text-cyan-400">Administration</p><h2 className="mt-1 text-2xl font-semibold">Game Studio</h2><p className="mt-2 text-sm text-slate-400">Published content is immutable; drafts advance through validation before release.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({key,label,icon:Icon}) => <div key={key} className="rounded-lg border border-white/10 bg-[#0a1728] p-4"><Icon className="text-cyan-400" size={18}/><p className="mt-5 text-3xl font-semibold">{data.counts[key]}</p><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p></div>)}</div>
    <div className="mt-5 rounded-lg border border-white/10 bg-[#0a1728]"><div className="border-b border-white/10 px-4 py-3 text-sm font-semibold">Content releases</div>{data.releases.map((release) => <div key={release.id} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/5 px-4 py-3 text-sm last:border-0"><span>{data.games.find((g) => g.id === release.game_id)?.title || 'Unknown game'}</span><span className="text-slate-400">v{release.version}</span><span className="text-emerald-400 capitalize">{release.status}</span></div>)}</div>
  </div>;
}