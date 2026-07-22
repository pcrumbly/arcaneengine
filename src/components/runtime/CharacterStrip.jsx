import { Activity, Coins, MapPin, Shield } from 'lucide-react';

export default function CharacterStrip({ character, location, characters, onSelect }) {
  const vitality = character.resources?.vitality ?? 0;
  return <section className="grid gap-3 border-y border-white/10 bg-[#0a1728] p-4 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
    <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-md bg-cyan-400/15 text-cyan-300 font-bold">{character.name.slice(0,2).toUpperCase()}</div><div><select aria-label="Active character" value={character.id} onChange={(e) => onSelect(e.target.value)} className="bg-transparent font-semibold outline-none">{characters.map((item) => <option className="bg-slate-900" value={item.id} key={item.id}>{item.name}</option>)}</select><p className="text-xs text-slate-500">Content {character.content_version}</p></div></div>
    <Metric icon={MapPin} label="Location" value={location?.name || 'Unknown'}/>
    <Metric icon={Activity} label="Vitality" value={`${vitality} / 100`}/>
    <div className="grid grid-cols-2 gap-3"><Metric icon={Shield} label="State" value={character.status}/><Metric icon={Coins} label="Funds" value={Object.values(character.currency || {}).reduce((a,b) => a+b, 0)}/></div>
  </section>;
}
function Metric({ icon: Icon, label, value }) { return <div className="rounded-md border border-white/10 bg-white/[.025] px-3 py-2"><p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500"><Icon size={12}/>{label}</p><p className="mt-1 truncate text-sm font-medium capitalize">{value}</p></div>; }