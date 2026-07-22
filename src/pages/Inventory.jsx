import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InventorySummary from '@/components/inventory/InventorySummary';
import InventoryTable from '@/components/inventory/InventoryTable';
import ItemDetailsDialog from '@/components/inventory/ItemDetailsDialog';

export default function Inventory() {
  const [data, setData] = useState(null), [query, setQuery] = useState(''), [category, setCategory] = useState('all'), [storage, setStorage] = useState('all'), [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [hasCharacter, setHasCharacter] = useState(true);
  const invoke = async (payload) => { setBusy(true); setError(''); try { const response = await base44.functions.invoke('runtimeCommand', payload); setData(response.data); setSelected((current) => current ? response.data.items.find((item) => item.id === current.id) || null : null); } catch (caught) { setError(caught.response?.data?.error || caught.message); } finally { setBusy(false); } };
  useEffect(() => { base44.functions.invoke('runtimeCommand', { command: 'GET_STATE' }).then(({data:runtime}) => { setHasCharacter(!!runtime.character); if (runtime.character) invoke({ command: 'GET_INVENTORY', characterId: runtime.character.id }); }); }, []);
  const categories = [...new Set((data?.items || []).map((item) => item.definition.category))];
  const filtered = useMemo(() => (data?.items || []).filter((item) => (category === 'all' || item.definition.category === category) && (storage === 'all' || (storage === 'loot') === (item.container?.container_type === 'loot')) && item.definition.name.toLowerCase().includes(query.toLowerCase())), [data, query, category, storage]);
  if (!hasCharacter) return <div className="p-6"><h2 className="text-2xl font-semibold">No active character</h2><p className="mt-2 text-sm text-slate-400">Create a character from the Runtime page before opening inventory.</p></div>;
  if (!data) return <div className="p-6 text-sm text-slate-400">Loading inventory…</div>;
  const action = (command, values = {}) => invoke({ command, characterId: data.character.id, itemId: selected.id, itemVersion: selected.version, ...values, requestId: crypto.randomUUID() });
  return <div className="p-4 sm:p-6"><p className="text-xs uppercase tracking-[.22em] text-cyan-400">Character / Assets</p><h2 className="mt-1 text-2xl font-semibold">Inventory & equipment</h2><div className="mt-5"><InventorySummary summary={data.summary}/></div>
    {error && <div role="alert" className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
    <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-500" size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items" className="w-full rounded-md border border-white/10 bg-[#0a1728] py-2 pl-9 pr-3 text-sm"/></label><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-white/10 bg-[#0a1728] px-3 py-2 text-sm"><option value="all">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select><select value={storage} onChange={(e) => setStorage(e.target.value)} className="rounded-md border border-white/10 bg-[#0a1728] px-3 py-2 text-sm"><option value="all">All storage</option><option value="carried">Carried items</option><option value="loot">Encounter loot</option></select></div>
    <div className="mt-3"><InventoryTable items={filtered} onInspect={setSelected}/></div><ItemDetailsDialog item={selected} items={data.items} containers={data.containers} busy={busy} onClose={() => setSelected(null)} onAction={action}/>
  </div>;
}