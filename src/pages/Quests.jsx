import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import QuestTable from '@/components/quests/QuestTable';
import QuestDialog from '@/components/quests/QuestDialog';
import PageLayout from '@/components/runtime/PageLayout';

export default function Quests() {
  const [data, setData] = useState(null), [tab, setTab] = useState('active'), [query, setQuery] = useState(''), [selected, setSelected] = useState(null), [available, setAvailable] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const invoke = async (payload) => { setBusy(true); setError(''); try { const response = await base44.functions.invoke('runtimeCommand', payload); setData(response.data); setSelected(null); } catch (caught) { setError(caught.response?.data?.error || caught.message); } finally { setBusy(false); } };
  useEffect(() => { base44.functions.invoke('runtimeCommand', { command: 'GET_STATE' }).then(({data}) => data.character && invoke({ command: 'GET_QUESTS', characterId: data.character.id })); }, []);
  const list = useMemo(() => { const source = tab === 'available' ? data?.available || [] : (data?.quests || []).filter((quest) => tab === 'all' || quest.state.toLowerCase() === tab); return source.filter((quest) => (quest.definition?.name || quest.name).toLowerCase().includes(query.toLowerCase())); }, [data, tab, query]);
  if (!data) return <div className="p-6 text-sm text-slate-400">Loading quests…</div>;
  const choose = (quest) => { setSelected(quest); setAvailable(tab === 'available'); };
  const action = (command, extra = {}) => invoke({ command, characterId: data.character.id, questDefinitionId: available ? selected.id : undefined, questInstanceId: available ? undefined : selected.id, questVersion: selected.version, requestId: crypto.randomUUID(), ...extra });
  return <PageLayout eyebrow="Character / Journal" title="Quests & objectives" description="Track available work, active objectives, decisions, rewards, and completed outcomes.">{error && <div role="alert" className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 rounded-md border border-white/10 bg-[#0a1728] p-1">{['active','available','completed','failed','all'].map((value) => <button key={value} onClick={() => setTab(value)} className={`rounded px-3 py-1.5 text-xs capitalize ${tab === value ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'}`}>{value}</button>)}</div><label className="relative"><Search className="absolute left-3 top-2.5 text-slate-500" size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search quests" className="rounded-md border border-white/10 bg-[#0a1728] py-2 pl-9 pr-3 text-sm"/></label></div>
    <div className="mt-3"><QuestTable quests={list} onSelect={choose} emptyText="No quests in this view"/></div><QuestDialog quest={selected} available={available} busy={busy} onClose={() => setSelected(null)} onAction={action}/>
  </PageLayout>;
}